// Author: Angel Colman
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Gift, Flag, Trophy } from 'lucide-react'
import { mediaUrl } from '@/lib/utils'
import {
  ALTO_BANNER_PREDICCION,
  heroBackgroundImageStyle,
  heroOverlayGradient,
  heroTextOutlineStyle,
  resolveHeroImageSettings,
} from '@/lib/hero-image'
import type { PremioDTO } from './tipos'
import { BotonCompartir } from './BotonCompartir'

const MEDALLAS = ['🥇', '🥈', '🥉']

/**
 * Lo que ve quien abre el enlace de un juego sin haber iniciado sesión.
 *
 * Antes la página lo mandaba derecho a iniciar sesión. Eso rompía dos cosas:
 * quien recibía el enlace por WhatsApp aterrizaba en un formulario sin saber
 * de qué juego se trataba, y los previsualizadores de enlaces -- que no
 * tienen sesión ni la van a tener -- solo veían la pantalla de ingreso, así
 * que la tarjeta compartida salía con el título del login.
 *
 * Ahora la portada cuenta de qué va y recién entonces invita a entrar.
 */
export function PortadaPublica({
  slug, titulo, descripcion, reglas, estado,
  banner, bannerSettings, marca, premios,
  colorPrimario, colorSecundario,
  cantidadPredicciones, cantidadParticipantes,
}: {
  slug: string
  titulo: string
  descripcion: string | null
  reglas: string | null
  estado: string
  banner: string | null
  bannerSettings: unknown
  marca: { name: string; logoUrl: string | null } | null
  premios: PremioDTO[]
  colorPrimario: string
  colorSecundario: string
  cantidadPredicciones: number
  cantidadParticipantes: number
}) {
  const encuadre = resolveHeroImageSettings(bannerSettings as never, ALTO_BANNER_PREDICCION)
  const entrar = `/cuenta/ingresar?volver=/predicciones/${slug}`

  return (
    <div className="min-h-screen bg-automotor-950 pb-16">
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${colorPrimario}, ${colorSecundario})` }} />

      <header
        className="relative overflow-hidden px-4 pb-8 pt-6 text-white"
        style={{
          background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`,
          ...(banner ? { minHeight: `${encuadre.height}px` } : {}),
        }}
      >
        {banner && (
          <>
            <div className="absolute inset-0" style={heroBackgroundImageStyle(encuadre, mediaUrl(banner))} />
            <div className="absolute inset-0" style={{ background: heroOverlayGradient(encuadre, 'landing') }} />
          </>
        )}

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center text-xs font-bold uppercase tracking-wider opacity-70 transition-opacity hover:opacity-100"
            >
              ← Automotor Play
            </Link>
            {marca && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-sm ring-1 ring-black/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Organiza</span>
                {marca.logoUrl ? (
                  <Image
                    src={mediaUrl(marca.logoUrl)}
                    alt={marca.name}
                    width={80}
                    height={24}
                    className="h-5 w-auto object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">{marca.name}</span>
                )}
              </span>
            )}
          </div>

          {estado === 'live' && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-3 py-1 text-[11px] font-black uppercase tracking-wider text-automotor-950">
              <Flag className="h-3.5 w-3.5" aria-hidden="true" /> En vivo
            </span>
          )}

          <h1
            className="font-expanded max-w-[16ch] text-2xl font-black leading-tight text-balance sm:text-3xl"
            style={banner ? heroTextOutlineStyle(encuadre, 0.7) : undefined}
          >
            {titulo}
          </h1>

          {descripcion && (
            <p
              className="mt-3 max-w-xl text-sm leading-relaxed text-white/90"
              style={banner ? heroTextOutlineStyle(encuadre, 0.4) : undefined}
            >
              {descripcion}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        {/* Qué hay adentro, antes de pedirle la cuenta a nadie. */}
        <div className="mt-5 flex flex-wrap gap-3">
          {cantidadPredicciones > 0 && (
            <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-automotor-200">
              <Flag className="h-4 w-4" aria-hidden="true" />
              <span className="tabular-nums">{cantidadPredicciones}</span> predicciones
            </span>
          )}
          {cantidadParticipantes > 0 && (
            <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-automotor-200">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              <span className="tabular-nums">{cantidadParticipantes}</span> participantes
            </span>
          )}
        </div>

        {premios.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200/40 bg-amber-50/95 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" /> Ganate esto
            </p>
            <ul className="space-y-2.5">
              {premios.slice(0, 3).map((p, i) => (
                <li key={p.id} className="flex min-w-0 items-center gap-3">
                  <span className="w-7 flex-shrink-0 text-center text-lg leading-none" aria-hidden="true">
                    {MEDALLAS[i] ?? '🎁'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">{p.name}</span>
                    {p.description && (
                      <span className="block truncate text-xs text-slate-500">{p.description}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {reglas && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-automotor-200">
            {reglas}
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-sm font-bold text-white">Para cargar tus predicciones necesitás una cuenta</p>
          <p className="mt-1 text-xs text-automotor-300">Es gratis y te lleva menos de un minuto.</p>
          <Link
            href={entrar}
            className="mt-4 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-8 text-base font-black text-white shadow-lg transition-all duration-300 hover:brightness-110 motion-reduce:transition-none"
            style={{ background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})` }}
          >
            Entrar y jugar <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>

          <div className="mt-4 flex justify-center">
            <BotonCompartir slug={slug} titulo={titulo} />
          </div>
        </div>
      </div>
    </div>
  )
}
