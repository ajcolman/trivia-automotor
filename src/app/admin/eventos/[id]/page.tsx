// Author: Angel Colman
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { eventLeaderboard } from '@/lib/predictions/resolver'
import { EventoResultados } from '@/components/admin/EventoResultados'

export const dynamic = 'force-dynamic'

export default async function EventoDetallePage({ params }: { params: { id: string } }) {
  const evento = await prisma.predictionEvent.findUnique({
    where: { id: params.id },
    select: {
      id: true, slug: true, title: true, status: true,
      prizes: { orderBy: { position: 'asc' }, select: { id: true, name: true, description: true, imageUrl: true, position: true } },
      contenders: {
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { orderIndex: 'asc' }],
        select: { id: true, number: true, name: true, category: true },
      },
      markets: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true, type: true, title: true, locksAt: true, config: true,
          segment: { select: { code: true, name: true } },
          resolution: { select: { value: true, revisedAt: true } },
          _count: { select: { predictions: true } },
        },
      },
    },
  })

  if (!evento) notFound()

  const ranking = await eventLeaderboard(evento.id, 20)

  // Métricas del evento. `distinct` cuenta jugadores únicos, no predicciones.
  const [jugadores, totalPredicciones, verificados, puntajes] = await Promise.all([
    prisma.prediction.findMany({
      where: { market: { eventId: evento.id } },
      select: { playerId: true },
      distinct: ['playerId'],
    }),
    prisma.prediction.count({ where: { market: { eventId: evento.id } } }),
    prisma.player.count({
      where: {
        emailVerifiedAt: { not: null },
        predictions: { some: { market: { eventId: evento.id } } },
      },
    }),
    prisma.prediction.aggregate({
      where: { market: { eventId: evento.id }, pointsAwarded: { not: null } },
      _sum: { pointsAwarded: true },
      _count: true,
    }),
  ])

  const conResultado = evento.markets.filter(m => m.resolution != null).length

  const estadisticas = {
    jugadores: jugadores.length,
    totalPredicciones,
    verificados,
    mercados: evento.markets.length,
    conResultado,
    // Cuán completas están las grillas: si todos cargaran todo, daría 100%.
    cobertura:
      jugadores.length > 0 && evento.markets.length > 0
        ? Math.round((totalPredicciones / (jugadores.length * evento.markets.length)) * 100)
        : 0,
    puntosRepartidos: puntajes._sum.pointsAwarded ?? 0,
  }

  return (
    <div className="p-6">
      <Link
        href="/admin/eventos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#005CA8]"
      >
        <ChevronLeft className="h-4 w-4" /> Juegos de predicción
      </Link>

      <EventoResultados
        eventoId={evento.id}
        titulo={evento.title}
        slug={evento.slug}
        estado={evento.status}
        contenders={evento.contenders.map(c => ({
          id: c.id,
          etiqueta: `${c.number ? `#${c.number} ` : ''}${c.name}${c.category ? ` · ${c.category}` : ''}`,
        }))}
        markets={evento.markets.map(m => ({
          id: m.id,
          type: m.type,
          titulo: m.segment ? `${m.segment.code} · ${m.segment.name}` : m.title,
          locksAt: m.locksAt.toISOString(),
          posiciones: (m.config as { positions?: number })?.positions ?? 1,
          resultado: (m.resolution?.value as string | string[] | null) ?? null,
          revisado: m.resolution?.revisedAt != null,
          predicciones: m._count.predictions,
        }))}
        ranking={ranking}
        estadisticas={estadisticas}
        premios={evento.prizes}
      />
    </div>
  )
}
