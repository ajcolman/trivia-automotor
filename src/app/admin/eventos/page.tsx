// Author: Angel Colman
import Link from 'next/link'
import { Flag, ChevronRight, Users, ListChecks, CheckCircle2, Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** Los estados que la sala lista en la portada (ver `src/app/page.tsx`). */
const VISIBLES_EN_SALA: string[] = ['open', 'live']

const ETIQUETA: Record<string, { texto: string; clase: string }> = {
  draft: { texto: 'Borrador', clase: 'bg-slate-100 text-slate-600' },
  open: { texto: 'Abierto', clase: 'bg-green-100 text-green-700' },
  live: { texto: 'En vivo', clase: 'bg-orange-100 text-orange-700' },
  closed: { texto: 'Cerrado', clase: 'bg-yellow-100 text-yellow-700' },
  settled: { texto: 'Liquidado', clase: 'bg-blue-100 text-blue-700' },
}

export default async function EventosPage() {
  const eventos = await prisma.predictionEvent.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, slug: true, title: true, status: true, closesAt: true,
      _count: { select: { markets: true, contenders: true, segments: true } },
    },
  })

  // Cuántos mercados ya tienen resultado y cuántos jugadores participaron.
  const resueltos = await prisma.resolution.groupBy({
    by: ['marketId'],
    _count: true,
  })
  const mercadosResueltos = new Set(resueltos.map(r => r.marketId))

  const conteos = await Promise.all(
    eventos.map(async e => {
      const [conResultado, jugadores] = await Promise.all([
        prisma.market.count({
          where: { eventId: e.id, id: { in: Array.from(mercadosResueltos) } },
        }),
        prisma.prediction.findMany({
          where: { market: { eventId: e.id } },
          select: { playerId: true },
          distinct: ['playerId'],
        }),
      ])
      return { id: e.id, conResultado, jugadores: jugadores.length }
    }),
  )
  const porEvento = new Map(conteos.map(c => [c.id, c]))

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#005CA8]">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Juegos de predicción</h1>
            <p className="text-sm text-slate-500">
              Armá el juego, cargá resultados y controlá cuándo está abierto al público.
            </p>
          </div>
        </div>
        <Link
          href="/admin/eventos/nuevo"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#005CA8] px-4 text-sm font-bold text-white transition-colors hover:bg-[#004E8F]"
        >
          <Plus className="h-4 w-4" /> Nuevo juego
        </Link>
      </div>

      {eventos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="font-semibold text-slate-500">Todavía no hay juegos cargados.</p>
          <p className="mb-4 mt-1 text-sm text-slate-400">
            Creá uno y cargale tramos, participantes y preguntas.
          </p>
          <Link
            href="/admin/eventos/nuevo"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#005CA8] px-4 text-sm font-bold text-white transition-colors hover:bg-[#004E8F]"
          >
            <Plus className="h-4 w-4" /> Crear el primero
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {eventos.map(e => {
            const c = porEvento.get(e.id)
            const et = ETIQUETA[e.status] ?? ETIQUETA.draft
            return (
              <Link
                key={e.id}
                href={`/admin/eventos/${e.id}`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#005CA8] hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-bold text-slate-900">{e.title}</h2>
                    <Badge className={`border-0 ${et.clase}`}>{et.texto}</Badge>
                    {VISIBLES_EN_SALA.includes(e.status) && (
                      <span className="text-xs font-semibold text-slate-400">visible en la sala</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{e._count.markets}</span> predicciones
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{c?.conResultado ?? 0}</span> con resultado
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{c?.jugadores ?? 0}</span> jugadores
                    </span>
                    {e.closesAt && <span>termina {formatDateShort(e.closesAt)}</span>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-300" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
