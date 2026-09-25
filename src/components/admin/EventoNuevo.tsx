// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, Link2 } from 'lucide-react'
import { slugify } from '@/lib/utils'
import { desdeInputLocal } from '@/lib/fecha-asuncion'

const campo =
  'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-[#005CA8] focus:outline-none focus:ring-2 focus:ring-[#005CA8]/15'

/**
 * Alta de un juego de predicción.
 *
 * Pide solo lo indispensable para que exista y tenga dirección propia. El
 * resto -- tramos, participantes, preguntas, premios, colores -- se carga
 * adentro, donde se ve el juego armándose.
 */
export function EventoNuevo() {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', description: '', closesAt: '' })

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
    router.push(`/admin/eventos/${cuerpo.evento.id}`)
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); crear() }}
      className="max-w-3xl space-y-6"
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">Título</span>
            <input
              type="text"
              className={campo}
              placeholder="Ueno Rally del Paraguay 2027"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
            <span className="mt-1.5 block text-xs text-slate-500">
              Es el nombre que se lee en la sala y dentro del juego.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">Dirección pública</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-[#005CA8] focus-within:ring-2 focus-within:ring-[#005CA8]/15">
              <Link2 className="h-4 w-4 flex-shrink-0 text-slate-300" aria-hidden="true" />
              <span className="flex-shrink-0 text-sm text-slate-400">/predicciones/</span>
              <input
                type="text"
                className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none"
                placeholder={slugify(form.title) || 'se-arma-con-el-titulo'}
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <span className="mt-1.5 block text-xs text-slate-500">
              Si lo dejás vacío se arma con el título
              {slug && <>: <span className="font-semibold text-slate-600">/predicciones/{slug}</span></>}.
              Después no conviene cambiarla: los enlaces que ya se hayan repartido dejarían de funcionar.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">
              Descripción <span className="font-normal text-slate-400">(opcional)</span>
            </span>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#005CA8] focus:outline-none focus:ring-2 focus:ring-[#005CA8]/15"
              placeholder="Ronda 9 del Mundial de Rally. 22 tramos en Itapúa."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <span className="mt-1.5 block text-xs text-slate-500">
              Lo que se lee bajo el título en la tarjeta de la sala.
            </span>
          </label>

          <label className="block sm:max-w-xs">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">
              Termina <span className="font-normal text-slate-400">(opcional)</span>
            </span>
            <input
              type="datetime-local"
              className={campo}
              value={form.closesAt}
              onChange={e => setForm(f => ({ ...f, closesAt: e.target.value }))}
            />
            <span className="mt-1.5 block text-xs text-slate-500">
              Hora de Asunción. Solo informativo: lo que cierra las predicciones es el horario de
              cada tramo.
            </span>
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={guardando || !form.title.trim()}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#005CA8] px-6 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-50"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Crear juego
        </button>
        <p className="text-xs text-slate-500">
          Nace en borrador: no se ve en la sala ni por URL hasta que lo pases a “Abierto”.
        </p>
      </div>
    </form>
  )
}
