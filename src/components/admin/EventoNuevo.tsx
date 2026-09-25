// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, X } from 'lucide-react'
import { slugify } from '@/lib/utils'
import { desdeInputLocal } from '@/lib/fecha-asuncion'

const campo =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-[#005CA8] focus:outline-none'

const VACIO = { title: '', slug: '', description: '', closesAt: '' }

/**
 * Alta de un juego de predicción.
 *
 * Solo pide lo indispensable: el resto -- tramos, participantes, preguntas,
 * premios, colores -- se carga adentro, donde se ve el juego armándose.
 */
export function EventoNuevo() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(VACIO)

  // Mientras no se toque a mano, la dirección sigue al título.
  const slug = form.slug ? slugify(form.slug) : slugify(form.title)

  async function crear() {
    if (!form.title.trim()) { toast.error('Poné un título al juego.'); return }

    setGuardando(true)
    const res = await fetch('/api/admin/prediction-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        slug: slug || undefined,
        description: form.description.trim() || null,
        closesAt: form.closesAt ? desdeInputLocal(form.closesAt) : null,
      }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(false)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo crear'); return }
    toast.success('Juego creado en borrador')
    setForm(VACIO)
    setAbierto(false)
    router.push(`/admin/eventos/${cuerpo.evento.id}`)
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#005CA8] px-4 text-sm font-bold text-white transition-colors hover:bg-[#004E8F]"
      >
        <Plus className="h-4 w-4" /> Nuevo juego
      </button>
    )
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
          Nuevo juego de predicción
        </h2>
        <button
          type="button"
          onClick={() => { setAbierto(false); setForm(VACIO) }}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Título</span>
          <input
            type="text" className={campo} placeholder="Ueno Rally del Paraguay 2027"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Dirección pública</span>
          <input
            type="text" className={campo} placeholder="se arma sola con el título"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
          />
          <span className="mt-1 block text-xs text-slate-400">
            /predicciones/{slug || '…'}
          </span>
        </label>
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs font-bold text-slate-500">Descripción</span>
          <input
            type="text" className={campo}
            placeholder="Lo que se lee en la tarjeta de la sala."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Termina</span>
          <input
            type="datetime-local" className={campo} value={form.closesAt}
            onChange={e => setForm(f => ({ ...f, closesAt: e.target.value }))}
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Nace en borrador: no se ve en la sala ni por URL hasta que lo pases a “Abierto”.
      </p>

      <button
        type="button"
        onClick={crear}
        disabled={guardando}
        className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#005CA8] px-5 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-60"
      >
        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Crear juego
      </button>
    </section>
  )
}
