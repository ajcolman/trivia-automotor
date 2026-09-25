// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ListChecks, Plus, Trash2, Loader2, Check } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TIPOS_MERCADO, CONFIG_POR_DEFECTO } from '@/lib/predictions/market-config'
import type { MarketConfig, MarketType } from '@/lib/predictions/scoring'
import { desdeInputLocal, formatoCorto } from '@/lib/fecha-asuncion'

export interface PreguntaFila {
  id: string
  type: MarketType
  title: string
  /** ISO */
  locksAt: string
  config: MarketConfig
  predicciones: number
  tieneResultado: boolean
  tramo: { id: string; code: string; name: string } | null
}

export interface TramoOpcion { id: string; code: string; name: string }

const campo =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-[#005CA8] focus:outline-none'

/** Etiqueta de cada parámetro de puntaje, en el idioma del panel. */
const ETIQUETA_CAMPO: Record<keyof MarketConfig, string> = {
  points: 'Puntos por acierto',
  exactAllPoints: 'Puntos si acierta todo',
  misplacedPoints: 'Puntos por posición equivocada',
  positions: 'Cuántos elige',
  tolerance: 'Tolerancia',
}

function resumenPuntaje(type: MarketType, config: MarketConfig): string {
  const campos = TIPOS_MERCADO.find(t => t.valor === type)?.campos ?? []
  return campos
    .map(c => `${ETIQUETA_CAMPO[c]}: ${config[c] ?? 0}`)
    .join(' · ')
}

export function EventoPreguntas({
  eventoId, preguntas, tramos,
}: { eventoId: string; preguntas: PreguntaFila[]; tramos: TramoOpcion[] }) {
  const router = useRouter()
  const [agregando, setAgregando] = useState(false)
  const [tocando, setTocando] = useState<string | null>(null)
  const [aBorrar, setABorrar] = useState<PreguntaFila | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [edicion, setEdicion] = useState<MarketConfig>({})
  const [nuevo, setNuevo] = useState<{
    title: string
    type: MarketType
    segmentId: string
    locksAt: string
    config: MarketConfig
  }>({
    title: '', type: 'single_pick', segmentId: '', locksAt: '',
    config: CONFIG_POR_DEFECTO.single_pick,
  })

  const tipoNuevo = TIPOS_MERCADO.find(t => t.valor === nuevo.type)!

  function cambiarTipo(type: MarketType) {
    setNuevo(n => ({ ...n, type, config: CONFIG_POR_DEFECTO[type] }))
  }

  async function agregar() {
    if (!nuevo.title.trim()) { toast.error('Poné el texto de la pregunta.'); return }
    if (!nuevo.segmentId && !nuevo.locksAt) {
      toast.error('Elegí un tramo o poné cuándo cierra la pregunta.'); return
    }

    setAgregando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}/markets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: nuevo.title.trim(),
        type: nuevo.type,
        segmentId: nuevo.segmentId || null,
        ...(nuevo.locksAt ? { locksAt: desdeInputLocal(nuevo.locksAt) } : {}),
        config: nuevo.config,
      }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setAgregando(false)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo agregar'); return }
    toast.success('Pregunta agregada')
    setNuevo(n => ({ ...n, title: '', segmentId: '', locksAt: '' }))
    router.refresh()
  }

  async function guardarPuntaje(p: PreguntaFila) {
    setTocando(p.id)
    const res = await fetch(`/api/admin/prediction-markets/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: edicion }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setTocando(null)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo guardar'); return }
    toast.success(
      p.tieneResultado
        ? 'Puntaje guardado. Volvé a cargar el resultado para repartir los puntos nuevos.'
        : 'Puntaje guardado',
    )
    setEditando(null)
    router.refresh()
  }

  async function borrar(p: PreguntaFila) {
    setABorrar(null)
    setTocando(p.id)
    const res = await fetch(`/api/admin/prediction-markets/${p.id}`, { method: 'DELETE' })
    const cuerpo = await res.json().catch(() => ({}))
    setTocando(null)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo borrar'); return }
    toast.success('Pregunta borrada')
    router.refresh()
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
        <ListChecks className="h-4 w-4" /> Preguntas y puntaje
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Cada pregunta cierra en su horario y reparte los puntos que se configuren acá.
        Las que cuelgan de un tramo siguen el horario del tramo.
      </p>

      {preguntas.length === 0 ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este juego no tiene preguntas: no hay nada para jugar todavía.
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-slate-100">
          {preguntas.map(p => {
            const tipo = TIPOS_MERCADO.find(t => t.valor === p.type)
            const abierta = editando === p.id
            return (
              <li key={p.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {p.title}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {tipo?.texto ?? p.type}
                      {p.tramo && <> · {p.tramo.code}</>}
                      {' · cierra '}
                      <span className="tabular-nums">{formatoCorto.format(new Date(p.locksAt))}</span>
                      {' · '}{p.predicciones} predicci{p.predicciones === 1 ? 'ón' : 'ones'}
                      {p.tieneResultado && <span className="font-semibold text-green-700"> · con resultado</span>}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setEditando(abierta ? null : p.id)
                      setEdicion(p.config)
                    }}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-[#005CA8] hover:text-[#005CA8]"
                  >
                    {abierta ? 'Cerrar' : 'Puntaje'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setABorrar(p)}
                    disabled={tocando === p.id}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                    aria-label={`Borrar pregunta ${p.title}`}
                  >
                    {tocando === p.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>

                {abierta ? (
                  <div className="mt-2.5 rounded-xl bg-slate-50 p-3">
                    <div className="flex flex-wrap items-end gap-3">
                      {(tipo?.campos ?? []).map(c => (
                        <label key={c} className="w-44">
                          <span className="mb-1 block text-xs font-bold text-slate-500">
                            {ETIQUETA_CAMPO[c]}
                          </span>
                          <input
                            type="number" min={0} className={`${campo} bg-white`}
                            value={edicion[c] ?? ''}
                            onChange={e =>
                              setEdicion(cfg => ({
                                ...cfg,
                                [c]: e.target.value === '' ? undefined : Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => guardarPuntaje(p)}
                        disabled={tocando === p.id}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#005CA8] px-4 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-60"
                      >
                        {tocando === p.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Check className="h-4 w-4" />}
                        Guardar
                      </button>
                    </div>
                    {p.tieneResultado && (
                      <p className="mt-2 text-xs text-amber-700">
                        Esta pregunta ya tiene resultado cargado. Cambiar el puntaje no repuntúa
                        sola: volvé a guardar el resultado para que se reparta con los valores nuevos.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">{resumenPuntaje(p.type, p.config)}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-slate-200 p-3">
        <p className="mb-2.5 text-xs font-black uppercase tracking-wider text-slate-400">
          Agregar pregunta
        </p>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px]">
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Pregunta</span>
            <input
              type="text" className={campo} placeholder="Podio final del rally"
              value={nuevo.title}
              onChange={e => setNuevo(n => ({ ...n, title: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Tipo</span>
            <select
              className={campo}
              value={nuevo.type}
              onChange={e => cambiarTipo(e.target.value as MarketType)}
            >
              {TIPOS_MERCADO.map(t => (
                <option key={t.valor} value={t.valor}>{t.texto}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-1.5 text-xs text-slate-500">{tipoNuevo.ayuda}</p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr]">
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Tramo</span>
            <select
              className={campo}
              value={nuevo.segmentId}
              onChange={e => setNuevo(n => ({ ...n, segmentId: e.target.value }))}
            >
              <option value="">Pregunta de todo el juego</option>
              {tramos.map(t => (
                <option key={t.id} value={t.id}>{t.code} · {t.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">
              Cierre {nuevo.segmentId && <span className="font-normal text-slate-400">(por defecto, el del tramo)</span>}
            </span>
            <input
              type="datetime-local" className={campo} value={nuevo.locksAt}
              onChange={e => setNuevo(n => ({ ...n, locksAt: e.target.value }))}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          {tipoNuevo.campos.map(c => (
            <label key={c} className="w-44">
              <span className="mb-1 block text-xs font-bold text-slate-500">{ETIQUETA_CAMPO[c]}</span>
              <input
                type="number" min={0} className={campo}
                value={nuevo.config[c] ?? ''}
                onChange={e =>
                  setNuevo(n => ({
                    ...n,
                    config: {
                      ...n.config,
                      [c]: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  }))
                }
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={agregar}
          disabled={agregando}
          className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#005CA8] px-5 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-60"
        >
          {agregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar pregunta
        </button>
      </div>

      <ConfirmDialog
        open={aBorrar != null}
        title="¿Borrar la pregunta?"
        description={
          aBorrar && aBorrar.predicciones > 0
            ? `Se borran también las ${aBorrar.predicciones} predicciones que ya cargaron los jugadores, con los puntos que hayan sumado.`
            : 'Todavía nadie respondió esta pregunta.'
        }
        confirmLabel="Borrar pregunta"
        destructive
        onConfirm={() => aBorrar && borrar(aBorrar)}
        onCancel={() => setABorrar(null)}
      />
    </section>
  )
}
