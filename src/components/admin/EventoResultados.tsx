// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, Trophy, Trash2, Lock, ExternalLink, Download, Users, RotateCcw,
  ListChecks, Percent, MailCheck, CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { FilaRanking } from '@/lib/predictions/resolver'
import { EventoPremios, type PremioFila } from './EventoPremios'
import { EventoTramos, type TramoFila } from './EventoTramos'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ContenderOpcion { id: string; etiqueta: string }

interface MarketFila {
  id: string
  type: string
  titulo: string
  locksAt: string
  posiciones: number
  resultado: string | string[] | null
  revisado: boolean
  predicciones: number
}

export interface EstadisticasEvento {
  jugadores: number
  totalPredicciones: number
  verificados: number
  mercados: number
  conResultado: number
  cobertura: number
  puntosRepartidos: number
}

interface Props {
  eventoId: string
  titulo: string
  slug: string
  estado: string
  contenders: ContenderOpcion[]
  markets: MarketFila[]
  ranking: FilaRanking[]
  estadisticas: EstadisticasEvento
  premios: PremioFila[]
  tramos: TramoFila[]
}

const ESTADOS: { valor: string; texto: string; ayuda: string }[] = [
  { valor: 'draft', texto: 'Borrador', ayuda: 'Oculto. No aparece en la landing ni es accesible por URL.' },
  { valor: 'open', texto: 'Abierto', ayuda: 'Visible y aceptando predicciones hasta el cierre de cada tramo.' },
  { valor: 'live', texto: 'En vivo', ayuda: 'El rally está corriendo. Igual que abierto, pero se muestra destacado.' },
  { valor: 'closed', texto: 'Cerrado', ayuda: 'Ya no se aceptan predicciones nuevas.' },
  { valor: 'settled', texto: 'Liquidado', ayuda: 'Resultados cargados y premios entregados.' },
]

const fFecha = new Intl.DateTimeFormat('es-PY', {
  timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

export function EventoResultados({
  eventoId, titulo, slug, estado, contenders, markets, ranking, estadisticas, premios, tramos,
}: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState<string | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [reinicio, setReinicio] = useState<'resultados' | 'todo' | null>(null)
  const [reiniciando, setReiniciando] = useState(false)
  const [borrador, setBorrador] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      markets.map(m => [
        m.id,
        Array.isArray(m.resultado) ? m.resultado : m.resultado ? [m.resultado] : [],
      ]),
    ),
  )

  async function cambiarEstado(status: string) {
    setCambiandoEstado(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setCambiandoEstado(false)
    if (res.ok) { toast.success('Estado actualizado'); router.refresh() }
    else toast.error((await res.json().catch(() => ({})))?.error ?? 'No se pudo cambiar el estado')
  }

  async function ejecutarReinicio(alcance: 'resultados' | 'todo') {
    setReiniciando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alcance }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setReiniciando(false)
    setReinicio(null)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo reiniciar'); return }
    toast.success(
      alcance === 'todo'
        ? `Se borraron ${cuerpo.resultados} resultados y ${cuerpo.predicciones} predicciones.`
        : `Se borraron ${cuerpo.resultados} resultados. Las predicciones quedaron sin puntuar.`,
    )
    router.refresh()
  }

  async function guardarResultado(m: MarketFila) {
    const elegidos = (borrador[m.id] ?? []).filter(Boolean)
    if (elegidos.length !== m.posiciones) {
      toast.error(
        m.posiciones === 1
          ? 'Elegí la tripulación ganadora.'
          : `Elegí las ${m.posiciones} posiciones del podio.`,
      )
      return
    }
    if (new Set(elegidos).size !== elegidos.length) {
      toast.error('No podés repetir la misma tripulación en dos posiciones.')
      return
    }

    setGuardando(m.id)
    const res = await fetch(`/api/admin/prediction-markets/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: m.posiciones === 1 ? elegidos[0] : elegidos }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(null)

    if (res.ok) {
      toast.success(
        cuerpo.puntuadas > 0
          ? `Resultado guardado. Se repuntuaron ${cuerpo.puntuadas} predicciones.`
          : 'Resultado guardado. Todavía nadie predijo este tramo.',
      )
      router.refresh()
    } else {
      toast.error(cuerpo?.error ?? 'No se pudo guardar el resultado')
    }
  }

  async function borrarResultado(m: MarketFila) {
    setGuardando(m.id)
    const res = await fetch(`/api/admin/prediction-markets/${m.id}`, { method: 'DELETE' })
    setGuardando(null)
    if (res.ok) {
      setBorrador(b => ({ ...b, [m.id]: [] }))
      toast.success('Resultado borrado. Las predicciones quedaron sin puntuar.')
      router.refresh()
    } else toast.error('No se pudo borrar')
  }

  const conResultado = markets.filter(m => m.resultado != null).length
  const ayudaEstado = ESTADOS.find(e => e.valor === estado)?.ayuda

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="tabular-nums">{conResultado}</span> de{' '}
            <span className="tabular-nums">{markets.length}</span> con resultado cargado
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/admin/prediction-events/${eventoId}/export`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-[#005CA8] hover:text-[#005CA8]"
          >
            <Download className="h-3.5 w-3.5" /> Exportar participantes
          </a>
          <button
            type="button"
            onClick={() => setReinicio('resultados')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-amber-400 hover:text-amber-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
          <a
            href={`/predicciones/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-[#005CA8] hover:text-[#005CA8]"
          >
            Ver como jugador <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* ── Estadísticas ──────────────────────────────────────── */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Jugadores', valor: estadisticas.jugadores, icono: Users },
          { label: 'Predicciones', valor: estadisticas.totalPredicciones, icono: ListChecks },
          { label: 'Grillas completas', valor: `${estadisticas.cobertura}%`, icono: Percent,
            ayuda: 'Del total posible si todos cargaran todas' },
          { label: 'Correos verificados', valor: estadisticas.verificados, icono: MailCheck },
          { label: 'Con resultado', valor: `${estadisticas.conResultado}/${estadisticas.mercados}`, icono: CheckCircle2 },
          { label: 'Puntos repartidos', valor: estadisticas.puntosRepartidos, icono: Trophy },
        ].map(m => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <m.icono className="mb-2 h-4 w-4 text-[#005CA8]" />
            <p className="text-xl font-black tabular-nums text-slate-900">{m.valor}</p>
            <p className="text-xs font-semibold text-slate-500">{m.label}</p>
            {m.ayuda && <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{m.ayuda}</p>}
          </div>
        ))}
      </section>

      {/* ── Estado ────────────────────────────────────────────── */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">
          Estado del juego
        </h2>
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map(e => (
            <button
              key={e.valor}
              type="button"
              disabled={cambiandoEstado || e.valor === estado}
              onClick={() => cambiarEstado(e.valor)}
              className={`min-h-[40px] rounded-xl px-4 text-sm font-bold transition-colors disabled:cursor-default
                ${e.valor === estado
                  ? 'bg-[#005CA8] text-white'
                  : 'border border-slate-200 text-slate-600 hover:border-[#005CA8] hover:text-[#005CA8]'}`}
            >
              {e.texto}
            </button>
          ))}
        </div>
        {ayudaEstado && <p className="mt-2.5 text-xs text-slate-500">{ayudaEstado}</p>}
      </section>

      <EventoPremios eventoId={eventoId} premios={premios} />

      <EventoTramos tramos={tramos} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* ── Resultados ─────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">
            Resultados
          </h2>
          <div className="space-y-2.5">
            {markets.map(m => {
              const cerrado = new Date(m.locksAt).getTime() <= Date.now()
              const cargado = m.resultado != null
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border bg-white p-4 ${cargado ? 'border-green-200' : 'border-slate-200'}`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{m.titulo}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className="tabular-nums">{fFecha.format(new Date(m.locksAt))}</span>
                        {cerrado && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Lock className="h-3 w-3" /> cerrado
                          </span>
                        )}
                        <span className="tabular-nums">{m.predicciones} predicciones</span>
                      </p>
                    </div>
                    {cargado && (
                      <Badge className="border-0 bg-green-100 text-green-700">
                        {m.revisado ? 'Corregido' : 'Resultado cargado'}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    {Array.from({ length: m.posiciones }).map((_, i) => (
                      <label key={i} className="flex-1 min-w-[220px]">
                        {m.posiciones > 1 && (
                          <span className="mb-1 block text-xs font-bold text-slate-500">
                            {i + 1}° puesto
                          </span>
                        )}
                        <select
                          value={borrador[m.id]?.[i] ?? ''}
                          onChange={ev => {
                            const v = ev.target.value
                            setBorrador(b => {
                              const lista = [...(b[m.id] ?? [])]
                              while (lista.length < m.posiciones) lista.push('')
                              lista[i] = v
                              return { ...b, [m.id]: lista }
                            })
                          }}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#005CA8] focus:outline-none"
                        >
                          <option value="">— Elegir tripulación —</option>
                          {contenders.map(c => (
                            <option key={c.id} value={c.id}>{c.etiqueta}</option>
                          ))}
                        </select>
                      </label>
                    ))}

                    <button
                      type="button"
                      onClick={() => guardarResultado(m)}
                      disabled={guardando === m.id}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#005CA8] px-4 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-60"
                    >
                      {guardando === m.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {cargado ? 'Corregir' : 'Guardar'}
                    </button>

                    {cargado && (
                      <button
                        type="button"
                        onClick={() => borrarResultado(m)}
                        disabled={guardando === m.id}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                        aria-label="Borrar resultado"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Ranking ────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
            <Trophy className="h-4 w-4" /> Ranking
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            {ranking.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">
                Todavía nadie cargó predicciones.
              </p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {ranking.map((f, i) => (
                  <li key={f.playerId} className="flex items-center gap-3 px-2 py-2.5">
                    <span className="w-6 text-center text-xs font-bold text-slate-400 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {f.nombre}
                      </span>
                      <span className="block truncate text-xs text-slate-400 tabular-nums">
                        {f.cargadas} cargadas · {f.acertadas} acertadas
                      </span>
                    </span>
                    <span className="text-sm font-black text-[#005CA8] tabular-nums">{f.puntos}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={reinicio !== null}
        title={reinicio === 'todo' ? 'Borrar todo el juego' : 'Reiniciar los resultados'}
        description={
          reinicio === 'todo'
            ? 'Se borran los resultados y también las predicciones que cargaron los jugadores. Las cuentas no se tocan. No se puede deshacer.'
            : 'Se borran los resultados cargados y las predicciones quedan sin puntuar, pero se conserva lo que eligió cada jugador. Sirve para rehacer una carga mal hecha.'
        }
        confirmLabel={reiniciando ? 'Reiniciando…' : reinicio === 'todo' ? 'Borrar todo' : 'Reiniciar resultados'}
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => ejecutarReinicio(reinicio ?? 'resultados')}
        onCancel={() => setReinicio(null)}
      />
    </>
  )
}
