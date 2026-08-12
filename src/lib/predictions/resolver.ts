// Author: Angel Colman
/**
 * Resolución de mercados y recálculo de puntajes.
 *
 * El recálculo es idempotente y arranca siempre de cero: en rally los tiempos
 * se revisan después del tramo por penalizaciones, así que un resultado puede
 * cambiar y hay que poder repuntuar sin arrastrar sumas viejas.
 */
import { prisma } from '@/lib/prisma'
import {
  scorePrediction,
  isValidPrediction,
  type MarketConfig,
  type MarketType,
} from './scoring'

export type ResolveResult =
  | { ok: true; puntuadas: number; revision: boolean }
  | { ok: false; error: string }

/**
 * Carga (o corrige) el resultado de un mercado y repuntúa todas sus
 * predicciones.
 */
export async function resolveMarket(
  marketId: string,
  value: unknown,
  enteredBy: string,
  source = 'manual',
): Promise<ResolveResult> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: {
      id: true, type: true, config: true, eventId: true,
      resolution: { select: { id: true } },
    },
  })
  if (!market) return { ok: false, error: 'No encontramos la pregunta.' }

  const config = (market.config ?? {}) as MarketConfig
  const tipo = market.type as MarketType

  // La forma del resultado es la misma que la de una predicción válida.
  if (!isValidPrediction(tipo, config, value)) {
    return { ok: false, error: 'El resultado no tiene la forma que espera esta pregunta.' }
  }

  // Los elegidos deben pertenecer al evento: evita cargar un piloto de otro
  // rally por copiar un id equivocado.
  const ids = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  if (ids.length > 0) {
    const validos = await prisma.contender.count({
      where: { id: { in: ids as string[] }, eventId: market.eventId },
    })
    if (validos !== new Set(ids).size) {
      return { ok: false, error: 'Alguna tripulación elegida no pertenece a este evento.' }
    }
  }

  const esRevision = market.resolution !== null

  await prisma.resolution.upsert({
    where: { marketId: market.id },
    update: {
      value: value as object,
      source,
      enteredBy,
      revisedAt: esRevision ? new Date() : null,
    },
    create: {
      marketId: market.id,
      value: value as object,
      source,
      enteredBy,
    },
  })

  const puntuadas = await rescoreMarket(market.id)
  return { ok: true, puntuadas, revision: esRevision }
}

/**
 * Repuntúa todas las predicciones de un mercado contra su resultado actual.
 * Se puede correr las veces que haga falta: el resultado no depende del
 * puntaje anterior.
 */
export async function rescoreMarket(marketId: string): Promise<number> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: {
      id: true, type: true, config: true,
      resolution: { select: { value: true } },
      predictions: { select: { id: true, value: true } },
    },
  })
  if (!market?.resolution) return 0

  const config = (market.config ?? {}) as MarketConfig
  const tipo = market.type as MarketType
  const scoredAt = new Date()

  const actualizaciones = market.predictions.map(p =>
    prisma.prediction.update({
      where: { id: p.id },
      data: {
        pointsAwarded: scorePrediction(tipo, config, p.value, market.resolution!.value),
        scoredAt,
      },
    }),
  )

  await prisma.$transaction(actualizaciones)
  return actualizaciones.length
}

/** Borra el resultado de un mercado y deja sus predicciones sin puntuar. */
export async function clearResolution(marketId: string): Promise<number> {
  const borradas = await prisma.resolution.deleteMany({ where: { marketId } })
  if (borradas.count === 0) return 0

  const { count } = await prisma.prediction.updateMany({
    where: { marketId },
    data: { pointsAwarded: null, scoredAt: null },
  })
  return count
}

export interface FilaRanking {
  playerId: string
  nombre: string
  email: string
  puntos: number
  acertadas: number
  cargadas: number
}

/** Tabla de posiciones del evento, de mayor a menor puntaje. */
export async function eventLeaderboard(eventId: string, limite = 100): Promise<FilaRanking[]> {
  const predicciones = await prisma.prediction.findMany({
    where: { market: { eventId } },
    select: {
      playerId: true,
      pointsAwarded: true,
      player: { select: { fullName: true, email: true } },
    },
  })

  const porJugador = new Map<string, FilaRanking>()
  for (const p of predicciones) {
    const fila = porJugador.get(p.playerId) ?? {
      playerId: p.playerId,
      nombre: p.player.fullName,
      email: p.player.email,
      puntos: 0,
      acertadas: 0,
      cargadas: 0,
    }
    fila.cargadas++
    if (p.pointsAwarded != null) {
      fila.puntos += p.pointsAwarded
      if (p.pointsAwarded > 0) fila.acertadas++
    }
    porJugador.set(p.playerId, fila)
  }

  return Array.from(porJugador.values())
    .sort((a, b) => b.puntos - a.puntos || b.acertadas - a.acertadas)
    .slice(0, limite)
}

/**
 * Tabla de posiciones para mostrarle al jugador.
 *
 * Los nombres van abreviados -- "Juan P." -- como en el ranking de trivias de
 * la landing: es una tabla pública y no corresponde exponer el nombre completo
 * de todos los participantes.
 */
export interface FilaPublica {
  posicion: number
  nombre: string
  puntos: number
  esVos: boolean
}

export async function publicLeaderboard(
  eventId: string,
  playerId: string,
  limite = 10,
): Promise<{ top: FilaPublica[]; vos: FilaPublica | null }> {
  const todos = await eventLeaderboard(eventId, 1000)

  const abreviar = (nombre: string) => {
    const partes = nombre.trim().split(/\s+/)
    return partes.length > 1
      ? `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`
      : partes[0]
  }

  const filas: FilaPublica[] = todos.map((f, i) => ({
    posicion: i + 1,
    nombre: f.playerId === playerId ? 'Vos' : abreviar(f.nombre),
    puntos: f.puntos,
    esVos: f.playerId === playerId,
  }))

  const top = filas.slice(0, limite)
  // Si el jugador quedó fuera del top, se le muestra igual su posición: saber
  // que se está 23º motiva más que no aparecer en ningún lado.
  const propia = filas.find(f => f.esVos) ?? null
  return { top, vos: propia && propia.posicion > limite ? propia : null }
}
