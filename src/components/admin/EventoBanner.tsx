// Author: Angel Colman
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ImageIcon, Loader2, Check, Car, X } from 'lucide-react'
import { HeroImageEditor } from './HeroImageEditor'
import { mediaUrl } from '@/lib/utils'
import { type HeroImageSettings, resolveHeroImageSettings } from '@/lib/hero-image'

export interface MarcaOpcion {
  id: string
  name: string
  logoUrl: string | null
  empresa: string
}

/** Alto por defecto del banner, en línea con el hero de la sala. */
const ALTO_BANNER = 320

/**
 * Banner y marca organizadora del juego de predicción.
 *
 * Reusa el mismo editor de imagen que las trivias y la configuración de la
 * plataforma: encuadre, zoom, oscurecido y contorno de texto se guardan con
 * el formato de `HeroImageSettings`, así una imagen encuadrada acá se ve
 * igual en la sala y en la cabecera del jugador.
 */
export function EventoBanner({
  eventoId, titulo, bannerUrl, bannerSettings, marcaId, marcas, colorPrimario,
}: {
  eventoId: string
  titulo: string
  bannerUrl: string | null
  bannerSettings: HeroImageSettings | null
  marcaId: string | null
  marcas: MarcaOpcion[]
  colorPrimario: string
}) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [url, setUrl] = useState(bannerUrl ?? '')
  const [settings, setSettings] = useState<HeroImageSettings>(
    resolveHeroImageSettings(bannerSettings, ALTO_BANNER),
  )
  const [marca, setMarca] = useState(marcaId ?? '')

  const marcaElegida = marcas.find(m => m.id === marca) ?? null
  const sucio =
    url !== (bannerUrl ?? '') ||
    marca !== (marcaId ?? '') ||
    JSON.stringify(settings) !== JSON.stringify(resolveHeroImageSettings(bannerSettings, ALTO_BANNER))

  async function guardar() {
    setGuardando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heroImageUrl: url.trim() || null,
        heroImageSettings: url.trim() ? settings : null,
        brandId: marca || null,
      }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(false)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo guardar'); return }
    toast.success('Banner y marca guardados')
    router.refresh()
  }

  // Agrupadas por empresa: el panel maneja varias y los nombres se repiten.
  const porEmpresa = marcas.reduce<Record<string, MarcaOpcion[]>>((acc, m) => {
    (acc[m.empresa] ??= []).push(m)
    return acc
  }, {})

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
        <ImageIcon className="h-4 w-4" /> Banner y marca
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        El banner es el fondo de la tarjeta en la sala y de la cabecera del juego. La marca sale
        junto al título, como quien organiza.
      </p>

      {/* ── Marca organizadora ───────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
        <label className="min-w-[14rem] flex-1">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Car className="h-3.5 w-3.5" aria-hidden="true" /> Marca que organiza
          </span>
          <select
            value={marca}
            onChange={e => setMarca(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#005CA8] focus:outline-none focus:ring-2 focus:ring-[#005CA8]/15"
          >
            <option value="">Sin marca</option>
            {Object.entries(porEmpresa).map(([empresa, lista]) => (
              <optgroup key={empresa} label={empresa}>
                {lista.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {/* Previa del sello tal como se ve sobre el banner. */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500">Se verá así</span>
          {marcaElegida ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-sm ring-1 ring-slate-900/10">
              {marcaElegida.logoUrl ? (
                <Image
                  src={mediaUrl(marcaElegida.logoUrl)}
                  alt=""
                  width={72}
                  height={24}
                  className="h-5 w-auto object-contain"
                  unoptimized
                />
              ) : (
                <Car className="h-4 w-4 text-slate-400" aria-hidden="true" />
              )}
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                {marcaElegida.name}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-400">
              <X className="h-3.5 w-3.5" aria-hidden="true" /> sin sello
            </span>
          )}
        </div>
      </div>

      {/* ── Banner ───────────────────────────────────────────────── */}
      <HeroImageEditor
        value={url}
        settings={settings}
        onChange={setUrl}
        onSettingsChange={setSettings}
        primaryColor={colorPrimario}
        label="Banner del juego"
        description="Se usa de fondo en la tarjeta de la sala y en la cabecera del juego. Arrastrá sobre la previa para encuadrar."
        previewTitle={titulo}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !sucio}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#005CA8] px-6 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-40"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Guardar banner y marca
        </button>
        {sucio && <span className="text-xs font-semibold text-amber-700">Hay cambios sin guardar</span>}
      </div>
    </section>
  )
}
