// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { buildCsv } from '@/lib/csv-export'

/**
 * Exporta los participantes del evento: una fila por jugador, con sus datos de
 * contacto, el puntaje total y lo que eligió en cada predicción.
 *
 * Es el equivalente al export de leads de las trivias. La diferencia es que
 * acá los datos vienen de la cuenta y no de un formulario por partida, así que
 * las columnas son fijas.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

  const evento = await prisma.predictionEvent.findUnique({
    where: { id: params.id },
    select: {
      title: true,
      slug: true,
      markets: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          title: true,
          type: true,
          segment: { select: { code: true } },
        },
      },
    },
  })

  if (!evento) {
    return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  }

  const [predicciones, contenders] = await Promise.all([
    prisma.prediction.findMany({
      where: { market: { eventId: params.id } },
      select: {
        marketId: true,
        value: true,
        pointsAwarded: true,
        updatedAt: true,
        player: {
          select: {
            id: true, fullName: true, email: true, phone: true,
            cedula: true, emailVerifiedAt: true, createdAt: true,
          },
        },
      },
    }),
    prisma.contender.findMany({
      where: { eventId: params.id },
      select: { id: true, number: true, name: true },
    }),
  ])

  const nombreDe = new Map(
    contenders.map(c => [c.id, `${c.number ? `#${c.number} ` : ''}${c.name}`]),
  )
  const legible = (v: unknown): string => {
    if (typeof v === 'string') return nombreDe.get(v) ?? v
    if (Array.isArray(v)) return v.map(x => nombreDe.get(String(x)) ?? String(x)).join(' | ')
    return v == null ? '' : String(v)
  }

  // Una fila por jugador: agrupamos sus predicciones por mercado.
  interface Fila {
    jugador: (typeof predicciones)[number]['player']
    puntos: number
    puntuadas: number
    porMercado: Map<string, string>
    ultima: Date | null
  }
  const filas = new Map<string, Fila>()

  for (const p of predicciones) {
    const fila = filas.get(p.player.id) ?? {
      jugador: p.player,
      puntos: 0,
      puntuadas: 0,
      porMercado: new Map<string, string>(),
      ultima: null,
    }
    fila.porMercado.set(p.marketId, legible(p.value))
    if (p.pointsAwarded != null) {
      fila.puntos += p.pointsAwarded
      fila.puntuadas++
    }
    if (!fila.ultima || p.updatedAt > fila.ultima) fila.ultima = p.updatedAt
    filas.set(p.player.id, fila)
  }

  const columnasMercado = evento.markets.map(m =>
    m.segment ? `${m.segment.code}` : m.title,
  )

  const headers = [
    'nombre', 'correo', 'telefono', 'cedula', 'correo_verificado',
    'cuenta_creada', 'puntos', 'predicciones_cargadas', 'predicciones_puntuadas',
    'ultima_modificacion', ...columnasMercado,
  ]

  const ordenadas = Array.from(filas.values()).sort((a, b) => b.puntos - a.puntos)

  const rows: unknown[][] = ordenadas.map(f => [
    f.jugador.fullName,
    f.jugador.email,
    f.jugador.phone,
    f.jugador.cedula ?? '',
    f.jugador.emailVerifiedAt ? 'si' : 'no',
    f.jugador.createdAt.toISOString(),
    f.puntos,
    f.porMercado.size,
    f.puntuadas,
    f.ultima?.toISOString() ?? '',
    ...evento.markets.map(m => f.porMercado.get(m.id) ?? ''),
  ])

  const csv = buildCsv(headers, rows)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${evento.slug}-participantes.csv"`,
    },
  })
}
