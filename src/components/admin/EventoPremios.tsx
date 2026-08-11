// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Gift, Plus, Trash2, Loader2, ImageOff } from 'lucide-react'
import { UploadDropzone } from './UploadDropzone'

export interface PremioFila {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  position: number
}

const MEDALLAS = ['🥇', '🥈', '🥉']

const campo =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-[#005CA8] focus:outline-none'

export function EventoPremios({
  eventoId, premios,
}: { eventoId: string; premios: PremioFila[] }) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState({
    name: '', description: '', imageUrl: '',
    position: String(premios.length + 1),
  })

  async function agregar() {
    if (!nuevo.name.trim()) { toast.error('Poné un nombre al premio.'); return }
    setGuardando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}/prizes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nuevo.name.trim(),
        description: nuevo.description.trim() || null,
        imageUrl: nuevo.imageUrl.trim() || null,
        position: Number(nuevo.position) || premios.length + 1,
      }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(false)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo agregar'); return }
    toast.success('Premio agregado')
    setNuevo({ name: '', description: '', imageUrl: '', position: String(premios.length + 2) })
    router.refresh()
  }

  async function borrar(id: string) {
    setBorrando(id)
    const res = await fetch(`/api/admin/prediction-prizes/${id}`, { method: 'DELETE' })
    setBorrando(null)
    if (res.ok) { toast.success('Premio borrado'); router.refresh() }
    else toast.error('No se pudo borrar')
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
        <Gift className="h-4 w-4" /> Premios
      </h2>

      {premios.length === 0 ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este juego no tiene premios cargados. La landing lo anuncia como “jugá y ganá”, así que
          conviene cargar al menos uno antes de abrirlo al público.
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-slate-100">
          {premios.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <span className="w-8 flex-shrink-0 text-center text-lg leading-none">
                {i < 3 ? MEDALLAS[i] : <span className="text-xs font-bold text-slate-400">{p.position}</span>}
              </span>
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <ImageOff className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-slate-900">{p.name}</span>
                {p.description && (
                  <span className="block truncate text-xs text-slate-500">{p.description}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => borrar(p.id)}
                disabled={borrando === p.id}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                aria-label={`Borrar premio ${p.name}`}
              >
                {borrando === p.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-slate-200 p-3">
        <p className="mb-2.5 text-xs font-black uppercase tracking-wider text-slate-400">
          Agregar premio
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[90px_1fr] lg:grid-cols-[90px_1fr_260px]">
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Puesto</span>
            <input
              type="number" min={1} className={campo} value={nuevo.position}
              onChange={e => setNuevo(n => ({ ...n, position: e.target.value }))}
            />
          </label>

          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-500">Premio</span>
              <input
                type="text" className={campo} placeholder="Casco de rally firmado"
                value={nuevo.name}
                onChange={e => setNuevo(n => ({ ...n, name: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-500">Detalle</span>
              <input
                type="text" className={campo} placeholder="Autografiado por la tripulación"
                value={nuevo.description}
                onChange={e => setNuevo(n => ({ ...n, description: e.target.value }))}
              />
            </label>
          </div>

          {/* Misma subida que el resto del panel: archivo a Vercel Blob, y el
              campo de URL queda por si el premio ya tiene una imagen publicada. */}
          <div>
            <span className="mb-1 block text-xs font-bold text-slate-500">Foto</span>
            <UploadDropzone
              value={nuevo.imageUrl || null}
              onUpload={url => setNuevo(n => ({ ...n, imageUrl: url }))}
              label="Arrastrá una foto o hacé clic"
            />
            <input
              type="text" className={`${campo} mt-2`} placeholder="…o pegá una URL"
              value={nuevo.imageUrl}
              onChange={e => setNuevo(n => ({ ...n, imageUrl: e.target.value }))}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={agregar}
          disabled={guardando}
          className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#005CA8] px-5 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-60"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar premio
        </button>
      </div>
    </section>
  )
}
