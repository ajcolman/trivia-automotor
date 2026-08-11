// Author: Angel Colman
'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'

interface Props {
  src: string
  /** Qué se ve en la foto. Se usa como texto alternativo y como pie. */
  alt: string
  className?: string
  width?: number
  height?: number
}

/**
 * Miniatura que se agranda al tocarla.
 *
 * Al abrir se guarda quién tenía el foco para devolvérselo al cerrar: si no,
 * quien navega con teclado vuelve al principio de la página cada vez.
 */
export function PhotoZoom({ src, alt, className, width = 48, height = 48 }: Props) {
  const [abierta, setAbierta] = useState(false)
  const origenRef = useRef<HTMLButtonElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierta) return

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(false) }
    document.addEventListener('keydown', onKey)

    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cerrarRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previo
      origenRef.current?.focus()
    }
  }, [abierta])

  return (
    <>
      <button
        ref={origenRef}
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ampliar foto: ${alt}`}
        className={`group relative overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-500 focus-visible:ring-offset-1 ${className ?? ''}`}
      >
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          unoptimized
        />
        <span className="absolute inset-0 flex items-center justify-center bg-automotor-950/0 opacity-0 transition-opacity group-hover:bg-automotor-950/45 group-hover:opacity-100 motion-reduce:transition-none">
          <ZoomIn className="h-4 w-4 text-white" aria-hidden="true" />
        </span>
      </button>

      {abierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out bg-automotor-950/90 backdrop-blur-sm"
            aria-label="Cerrar"
            tabIndex={-1}
            onClick={() => setAbierta(false)}
          />

          <button
            ref={cerrarRef}
            type="button"
            onClick={() => setAbierta(false)}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* `unoptimized` y dimensiones grandes: la foto la sube el admin y no
              conocemos su tamaño real, así que la dejamos escalar sola. */}
          <Image
            src={src}
            alt={alt}
            width={1400}
            height={1400}
            className="relative max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            unoptimized
          />
          <p className="relative mt-3 max-w-md text-center text-sm text-white/80">{alt}</p>
        </div>
      )}
    </>
  )
}
