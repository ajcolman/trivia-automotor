// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock, Loader2, Ban, RotateCcw, Check } from 'lucide-react'

export interface TramoFila {
  id: string
  code: string
  name: string
  distanceKm: number | null
  /** ISO */
  locksAt: string
  isCancelled: boolean
}

const TZ = 'America/Asuncion'

/**
 * Pasa un instante a lo que espera un `datetime-local`, pero expresado en hora
 * de Asunción: el input no tiene zona, así que si usáramos la del navegador,
 * alguien editando desde otro huso vería y guardaría horarios corridos.
 */
function aInputLocal(iso: string): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso))
  const v = (t: string) => p.find(x => x.type === t)!.value
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`
}

/** Vuelve a un ISO absoluto, interpretando lo tipeado como hora de Asunción. */
function desdeInputLocal(valor: string): string {
  // Paraguay usa UTC-03:00 todo el año desde 2024.
  return new Date(`${valor}:00-03:00`).toISOString()
}

export function EventoTramos({ tramos }: { tramos: TramoFila[] }) {
  const router = useRouter()
  const [guardando, setGuardando] = useState<string | null>(null)
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

      <ul className="divide-y divide-slate-100">
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
              {t.distanceKm != null && (
                <span className="block text-xs text-slate-400 tabular-nums">{t.distanceKm} km</span>
              )}
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
          </li>
        ))}
      </ul>
    </section>
  )
}
