// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock, Loader2, Ban, RotateCcw, Check, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { aInputLocal, desdeInputLocal } from '@/lib/fecha-asuncion'

export interface TramoFila {
  id: string
  code: string
  name: string
  distanceKm: number | null
  /** ISO */
  locksAt: string
  isCancelled: boolean
  /** Cuántas preguntas cuelgan del tramo y qué se predijo en ellas. */
  preguntas: number
  predicciones: number
}

const campo =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-[#005CA8] focus:outline-none'

const NUEVO_VACIO = { code: '', name: '', distanceKm: '', startsAt: '', conPregunta: true }

export function EventoTramos({ eventoId, tramos }: { eventoId: string; tramos: TramoFila[] }) {
  const router = useRouter()
  const [guardando, setGuardando] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [aBorrar, setABorrar] = useState<TramoFila | null>(null)
  const [nuevo, setNuevo] = useState(NUEVO_VACIO)
  const [borrador, setBorrador] = useState<Record<string, string>>(() =>
    Object.fromEntries(tramos.map(t => [t.id, aInputLocal(t.locksAt)])),
  )

  async function guardar(t: TramoFila) {
    const valor = borrador[t.id]
    if (!valor) return

    setGuardando(t.id)
    const res = await fetch(`/api/admin/prediction-segments/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startsAt: desdeInputLocal(valor),
        locksAt: desdeInputLocal(valor),
      }),
    })
    setGuardando(null)
    if (res.ok) { toast.success(`${t.code} reprogramado`); router.refresh() }
    else toast.error((await res.json().catch(() => ({})))?.error ?? 'No se pudo guardar')
  }

  async function alternarCancelado(t: TramoFila) {
    setGuardando(t.id)
    const res = await fetch(`/api/admin/prediction-segments/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCancelled: !t.isCancelled }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(null)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo guardar'); return }
    toast.success(
      t.isCancelled
        ? `${t.code} rehabilitado`
        : cuerpo.despuntuadas > 0
          ? `${t.code} cancelado. Se anularon ${cuerpo.despuntuadas} predicciones puntuadas.`
          : `${t.code} cancelado`,
    )
    router.refresh()
  }

  async function agregar() {
    if (!nuevo.code.trim() || !nuevo.name.trim()) {
      toast.error('El tramo necesita código y nombre.'); return
    }
    if (!nuevo.startsAt) { toast.error('Poné la hora de largada.'); return }

    setAgregando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: nuevo.code.trim(),
        name: nuevo.name.trim(),
        distanceKm: nuevo.distanceKm ? Number(nuevo.distanceKm) : null,
        startsAt: desdeInputLocal(nuevo.startsAt),
        conPregunta: nuevo.conPregunta,
      }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setAgregando(false)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo agregar'); return }
    toast.success(
      nuevo.conPregunta
        ? `${nuevo.code.trim()} agregado con su pregunta de ganador`
        : `${nuevo.code.trim()} agregado`,
    )
    // El horario se conserva: los tramos de un mismo día se cargan seguidos.
    setNuevo(n => ({ ...NUEVO_VACIO, startsAt: n.startsAt, conPregunta: n.conPregunta }))
    router.refresh()
  }

  async function borrar(t: TramoFila) {
    setABorrar(null)
    setGuardando(t.id)
    const res = await fetch(`/api/admin/prediction-segments/${t.id}`, { method: 'DELETE' })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(null)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo borrar'); return }
    toast.success(`${t.code} borrado`)
    router.refresh()
  }

  const cancelados = tramos.filter(t => t.isCancelled).length

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
        <CalendarClock className="h-4 w-4" /> Tramos y horarios
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        El horario es el cierre de las predicciones de ese tramo, en hora de Asunción.
        Cambiarlo mueve también el cierre de su pregunta.
        {cancelados > 0 && (
          <span className="font-semibold text-amber-700"> · {cancelados} cancelado{cancelados !== 1 ? 's' : ''}</span>
        )}
      </p>

      {tramos.length === 0 ? (
        <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Todavía no hay tramos. Cargá el itinerario acá abajo: cada tramo puede venir con su
          pregunta de ganador ya armada.
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-slate-100">
          {tramos.map(t => (
            <li
              key={t.id}
              className={`flex flex-wrap items-center gap-3 py-2.5 ${t.isCancelled ? 'opacity-55' : ''}`}
            >
              <span className="w-16 flex-shrink-0 text-sm font-black text-[#005CA8]">{t.code}</span>

              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-semibold text-slate-800 ${t.isCancelled ? 'line-through' : ''}`}>
                  {t.name}
                </span>
                <span className="block text-xs text-slate-400 tabular-nums">
                  {t.distanceKm != null && <>{t.distanceKm} km · </>}
                  {t.preguntas} pregunta{t.preguntas !== 1 ? 's' : ''}
                </span>
              </span>

              <input
                type="datetime-local"
                value={borrador[t.id] ?? ''}
                disabled={t.isCancelled}
                onChange={e => setBorrador(b => ({ ...b, [t.id]: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-2 text-sm text-slate-900 focus:border-[#005CA8] focus:outline-none disabled:bg-slate-50"
              />

              <button
                type="button"
                onClick={() => guardar(t)}
                disabled={guardando === t.id || t.isCancelled || borrador[t.id] === aInputLocal(t.locksAt)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#005CA8] px-3 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-40"
              >
                {guardando === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Guardar
              </button>

              <button
                type="button"
                onClick={() => alternarCancelado(t)}
                disabled={guardando === t.id}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors disabled:opacity-60
                  ${t.isCancelled
                    ? 'border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-700'
                    : 'border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-700'}`}
                aria-label={t.isCancelled ? `Rehabilitar ${t.code}` : `Cancelar ${t.code}`}
                title={t.isCancelled ? 'Rehabilitar tramo' : 'Cancelar tramo'}
              >
                {t.isCancelled ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => setABorrar(t)}
                disabled={guardando === t.id}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                aria-label={`Borrar tramo ${t.code}`}
                title="Borrar tramo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-slate-200 p-3">
        <p className="mb-2.5 text-xs font-black uppercase tracking-wider text-slate-400">
          Agregar tramo
        </p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[100px_1fr_110px_190px]">
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Código</span>
            <input
              type="text" className={campo} placeholder="SS1" value={nuevo.code}
              onChange={e => setNuevo(n => ({ ...n, code: e.target.value }))}
            />
          </label>
          <label className="col-span-2 lg:col-span-1">
            <span className="mb-1 block text-xs font-bold text-slate-500">Nombre</span>
            <input
              type="text" className={campo} placeholder="Ypacaraí" value={nuevo.name}
              onChange={e => setNuevo(n => ({ ...n, name: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Km</span>
            <input
              type="number" step="0.01" min={0} className={campo} placeholder="18,5"
              value={nuevo.distanceKm}
              onChange={e => setNuevo(n => ({ ...n, distanceKm: e.target.value }))}
            />
          </label>
          <label className="col-span-2 lg:col-span-1">
            <span className="mb-1 block text-xs font-bold text-slate-500">Largada</span>
            <input
              type="datetime-local" className={campo} value={nuevo.startsAt}
              onChange={e => setNuevo(n => ({ ...n, startsAt: e.target.value }))}
            />
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox" checked={nuevo.conPregunta}
            onChange={e => setNuevo(n => ({ ...n, conPregunta: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 accent-[#005CA8]"
          />
          Crear también la pregunta “Ganador del tramo”
        </label>

        <button
          type="button"
          onClick={agregar}
          disabled={agregando}
          className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#005CA8] px-5 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-60"
        >
          {agregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar tramo
        </button>
      </div>

      <ConfirmDialog
        open={aBorrar != null}
        title={`¿Borrar el tramo ${aBorrar?.code}?`}
        description={
          aBorrar
            ? aBorrar.predicciones > 0
              ? `Se borran también sus ${aBorrar.preguntas} pregunta${aBorrar.preguntas !== 1 ? 's' : ''} y las ${aBorrar.predicciones} predicciones que ya cargaron los jugadores. Si el tramo se suspendió pero el rally sigue, conviene cancelarlo en vez de borrarlo: así los puntos quedan registrados.`
              : `Se borran también sus ${aBorrar.preguntas} pregunta${aBorrar.preguntas !== 1 ? 's' : ''}. Todavía nadie predijo en este tramo.`
            : undefined
        }
        confirmLabel="Borrar tramo"
        destructive
        onConfirm={() => aBorrar && borrar(aBorrar)}
        onCancel={() => setABorrar(null)}
      />
    </section>
  )
}
