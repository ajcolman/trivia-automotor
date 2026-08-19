// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Type } from 'lucide-react'

export interface TextosEvento {
  title: string
  description: string | null
  rules: string | null
}

/** Mismos topes que valida el PATCH del evento. */
const LARGO: Record<keyof TextosEvento, number> = { title: 120, description: 500, rules: 2000 }

/**
 * Textos del juego de predicción.
 *
 * Hasta ahora el título, la bajada de la sala y las reglas solo existían con lo
 * que dejó el sembrado: para corregir una coma había que tocar la base. Son los
 * tres textos que lee el jugador, así que se editan desde acá.
 */
export function EventoTextos({ eventoId, textos: iniciales }: { eventoId: string; textos: TextosEvento }) {
  const router = useRouter()
  const [textos, setTextos] = useState<TextosEvento>(iniciales)
  const [guardando, setGuardando] = useState(false)

  const normalizar = (v: string | null) => (v ?? '').trim()
  const hayCambios = (Object.keys(LARGO) as (keyof TextosEvento)[]).some(
    k => normalizar(textos[k]) !== normalizar(iniciales[k]),
  )
  const excedido = (Object.keys(LARGO) as (keyof TextosEvento)[]).some(
    k => (textos[k] ?? '').length > LARGO[k],
  )

  async function guardar() {
    if (!normalizar(textos.title)) {
      toast.error('El título no puede quedar vacío.')
      return
    }

    setGuardando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: normalizar(textos.title),
        description: normalizar(textos.description) || null,
        rules: normalizar(textos.rules) || null,
      }),
    })
    setGuardando(false)

    if (res.ok) { toast.success('Textos actualizados'); router.refresh() }
    else toast.error((await res.json().catch(() => ({})))?.error ?? 'No se pudieron guardar los textos')
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
          <Type className="h-4 w-4" /> Textos del juego
        </h2>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !hayCambios || excedido}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#005CA8] px-4 py-2 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Guardar textos
        </button>
      </div>

      <div className="space-y-4">
        <Campo
          etiqueta="Título"
          ayuda="Encabeza el gabinete de la sala y la portada del juego."
          largo={(textos.title ?? '').length}
          maximo={LARGO.title}
        >
          <input
            type="text"
            value={textos.title}
            maxLength={LARGO.title}
            onChange={e => setTextos(t => ({ ...t, title: e.target.value }))}
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:border-[#005CA8] focus:outline-none"
          />
        </Campo>

        <Campo
          etiqueta="Descripción"
          ayuda="La bajada del gabinete en la sala. Se recorta a dos líneas, así que conviene que sea corta."
          largo={(textos.description ?? '').length}
          maximo={LARGO.description}
        >
          <textarea
            value={textos.description ?? ''}
            maxLength={LARGO.description}
            rows={2}
            onChange={e => setTextos(t => ({ ...t, description: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-900 focus:border-[#005CA8] focus:outline-none"
          />
        </Campo>

        <Campo
          etiqueta="Reglas"
          ayuda="El recuadro que se lee arriba de todo dentro del juego: cómo se puntúa y qué se gana."
          largo={(textos.rules ?? '').length}
          maximo={LARGO.rules}
        >
          <textarea
            value={textos.rules ?? ''}
            maxLength={LARGO.rules}
            rows={4}
            onChange={e => setTextos(t => ({ ...t, rules: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-900 focus:border-[#005CA8] focus:outline-none"
          />
        </Campo>
      </div>
    </section>
  )
}

function Campo({
  etiqueta, ayuda, largo, maximo, children,
}: {
  etiqueta: string
  ayuda: string
  largo: number
  maximo: number
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-slate-700">{etiqueta}</span>
        <span className={`text-[11px] tabular-nums ${largo > maximo * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
          {largo}/{maximo}
        </span>
      </span>
      {children}
      <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>
    </label>
  )
}
