// Author: Angel Colman
import Image from 'next/image'
import Link from 'next/link'

/**
 * Marca "Play" de Automotor Play: triángulo de play con esquinas redondeadas
 * dentro de un anillo grueso abierto — el mismo lenguaje del monograma "Am"
 * de Automotor (anillo que se interrumpe donde la forma lo atraviesa).
 * La abertura del anillo queda a la derecha, hacia donde apunta el play.
 * Hereda `currentColor` para adaptarse al contexto (nav claro / footer oscuro).
 */
export function PlayMark({ className, ring = true }: { className?: string; ring?: boolean }) {
  return (
    <svg
      viewBox={ring ? '0 0 100 100' : '32 26 48 48'}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ring && (
        <path
          d="M 85.96 67.53 A 40 40 0 1 1 85.96 32.47"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
        />
      )}
      <path
        d="M 42 35 L 70 50 L 42 65 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Lockup completo: logo de Automotor + marca Play + "Play".
 * Se anuncia como una sola cosa; las piezas van ocultas al lector de pantalla.
 */
export function PlayLockup({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Automotor Play — inicio"
      className={`flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300 rounded-lg ${className}`}
    >
      <Image
        src="/uploads/logoa.png"
        alt=""
        aria-hidden="true"
        width={160}
        height={52}
        className="h-7 sm:h-8 w-auto object-contain"
        unoptimized
      />
      <span aria-hidden="true" className="-ml-1 flex items-center gap-1.5 text-automotor-600">
        <PlayMark className="h-6 w-6 sm:h-7 sm:w-7" />
        <span className="font-expanded font-black text-lg sm:text-xl tracking-tight leading-none">
          Play
        </span>
      </span>
    </Link>
  )
}
