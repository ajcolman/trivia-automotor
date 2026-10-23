// Author: Angel Colman
/**
 * Quién se puede elegir en una pregunta.
 *
 * `MarketContender` sin filas significa "todos los del evento". La
 * elegibilidad responde quién larga esa pregunta, no contra quién compite: en
 * rally hay tripulaciones anotadas solo a la clasificación, y a una que no
 * larga el tramo no se le puede ganar.
 *
 * Esto se comprueba en el servidor y no solo en la pantalla, porque el cliente
 * manda el id que quiera.
 */
import { prisma } from '@/lib/prisma'

export type Elegibilidad = { ok: true } | { ok: false; error: string }

/** Los ids que trae una predicción o un resultado, sea de un tipo o de otro. */
export function idsElegidos(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value) && value.every(v => typeof v === 'string')) return value as string[]
  return []
}

/**
 * Comprueba que lo elegido exista, sea de este evento y pueda elegirse acá.
 *
 * @param exigirActivo Para el jugador sí: una tripulación retirada no se puede
 *   elegir. Para cargar un resultado no, porque el resultado es un hecho ya
 *   ocurrido y la tripulación pudo haberse desactivado después del tramo.
 */
export async function validarElegibles(
  marketId: string,
  eventId: string,
  value: unknown,
  exigirActivo: boolean,
): Promise<Elegibilidad> {
  const ids = idsElegidos(value)
  if (ids.length === 0) return { ok: true } // mercados numéricos, sin contendientes

  const unicos = Array.from(new Set(ids))
  const activo = exigirActivo ? { isActive: true } : {}

  const declarados = await prisma.marketContender.count({ where: { marketId } })

  if (declarados === 0) {
    const validos = await prisma.contender.count({
      where: { id: { in: unicos }, eventId, ...activo },
    })
    return validos === unicos.length
      ? { ok: true }
      : { ok: false, error: 'Alguna tripulación elegida no está en este juego.' }
  }

  const elegibles = await prisma.marketContender.count({
    where: {
      marketId,
      contenderId: { in: unicos },
      contender: { eventId, ...activo },
    },
  })
  return elegibles === unicos.length
    ? { ok: true }
    : { ok: false, error: 'Alguna tripulación elegida no larga este tramo.' }
}
