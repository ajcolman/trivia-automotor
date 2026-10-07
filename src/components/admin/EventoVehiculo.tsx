// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Car, Loader2, Check, Sparkles } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { mediaUrl } from '@/lib/utils'

export interface SpriteOpcion {
  id: string
  /** `Hyundai · Tucson`, o el tipo genérico si no tiene modelo. */
  etiqueta: string
  spriteUrl: string
}

/**
 * Qué vehículo cruza la tarjeta del juego en la sala y su cabecera.
 *
 * Se elige del mismo catálogo de sprites que usa el torneo de fútbol, así no
 * hay dos listas de autos que mantener. La opción de fábrica es el i20 N de
 * rally, que es el único animado: los del catálogo son PNG fijos.
 */
export function EventoVehiculo({
  eventoId, spriteId, sprites, mostrar, conBanner,
}: {
  eventoId: string
  spriteId: string | null
  sprites: SpriteOpcion[]
  /** Si el vehículo se dibuja. */
  mostrar: boolean
  /** El juego tiene banner: cambia qué conviene avisar, no qué se puede hacer. */
  conBanner: boolean
}) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [elegido, setElegido] = useState<string | null>(spriteId)
  const [visible, setVisible] = useState(mostrar)

  const sucio = elegido !== spriteId || visible !== mostrar

  async function guardar() {
    setGuardando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleSpriteId: elegido, showVehicle: visible }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(false)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo guardar'); return }
    toast.success('Vehículo guardado')
    router.refresh()
  }

  /** Tarjeta de una opción. El fondo navy es el de la sala, donde se va a ver. */
  function Opcion({
    id, etiqueta, children, nota,
  }: {
    id: string | null
    etiqueta: string
    children: React.ReactNode
    nota?: string
  }) {
    const activo = elegido === id
    return (
      <button
        type="button"
        onClick={() => setElegido(id)}
        aria-pressed={activo}
        className={`group flex w-36 flex-col overflow-hidden rounded-xl border-2 text-left transition-colors ${
          activo
            ? 'border-[#005CA8] ring-2 ring-[#005CA8]/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="relative flex h-20 items-end justify-center bg-automotor-950 px-2 pb-1">
          {children}
          {activo && (
            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#005CA8] text-white">
              <Check className="h-3 w-3" />
            </span>
          )}
        </span>
        <span className="flex-1 px-2 py-1.5">
          <span className="block truncate text-xs font-bold text-slate-700">{etiqueta}</span>
          {nota && <span className="block text-[11px] text-slate-400">{nota}</span>}
        </span>
      </button>
    )
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
        <Car className="h-4 w-4" /> Vehículo
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Cruza la tarjeta del juego en la sala y su cabecera. Sale del catálogo de sprites, el mismo
        que usan los torneos. Los nuevos se cargan en Panel → Sprites Vehículos.
      </p>

      {/* ── Mostrarlo o no ──────────────────────────────────────── */}
      <label className="mb-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
        <Switch checked={visible} onCheckedChange={setVisible} />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-700">Mostrar el vehículo</span>
          <span className="block text-xs text-slate-500">
            {conBanner
              ? 'Este juego tiene banner. Sobre una foto cargada el auto puede estorbar o puede quedar bien: miralo y decidí. Tené en cuenta que el i20 N se recorta contra un fondo plano, así que sobre la foto se le nota un velo claro; los del catálogo son PNG con transparencia y se ven limpios.'
              : 'Sin banner, el auto es lo que le da vida a la tarjeta y a la cabecera.'}
          </span>
        </span>
      </label>

      <div className={`flex flex-wrap gap-3 ${visible ? '' : 'opacity-50'}`}>
        <Opcion id={null} etiqueta="i20 N Rally" nota="animado · de fábrica">
          {/* El still, no el video: en el panel no hace falta bajar el loop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sprites/i20n-rally-8bit.png"
            alt=""
            aria-hidden="true"
            className="max-h-16 w-auto object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <Sparkles className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-brand-accent" aria-hidden="true" />
        </Opcion>

        {sprites.map(s => (
          <Opcion key={s.id} id={s.id} etiqueta={s.etiqueta}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(s.spriteUrl)}
              alt=""
              aria-hidden="true"
              className="max-h-14 w-auto object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </Opcion>
        ))}
      </div>

      {sprites.length === 0 && (
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          El catálogo está vacío. Los sprites se cargan en Panel → Sprites Vehículos.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !sucio}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#005CA8] px-6 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-40"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Guardar vehículo
        </button>
        {sucio && <span className="text-xs font-semibold text-amber-700">Hay cambios sin guardar</span>}
      </div>
    </section>
  )
}
