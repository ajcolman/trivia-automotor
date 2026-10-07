// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { mediaUrl } from '@/lib/utils'

/** Sprite elegido para el juego. Null = el i20 N de rally que viene de fábrica. */
export interface SpriteVehiculo {
  url: string
  nombre: string
}

/** El i20 N de rally animado: el que corre si el juego no eligió otro. */
const I20_RALLY = {
  still: '/sprites/i20n-rally-8bit.png',
  loop: '/sprites/i20n-rally-loop.mp4',
  poster: '/sprites/i20n-rally-poster.png',
  ancho: 348,
  alto: 126,
} as const

/**
 * El vehículo en 8 bits que cruza la tarjeta y la cabecera del juego.
 *
 * Por defecto es el i20 N de rally, animado. Ese video viene con fondo negro
 * y el MP4 no admite canal alfa, así que en lugar de transcodificar usamos
 * `mix-blend-mode: screen`: sobre el azul profundo de la plataforma el negro
 * se vuelve invisible y el auto queda recortado. Medido, el fondo es negro
 * casi puro (1,1,1), que es lo que hace que el truco funcione limpio.
 *
 * Cae a la imagen fija cuando el visitante pidió menos movimiento, con datos
 * móviles o conexión lenta, y también mientras el video no cargó: nunca hay
 * un hueco vacío.
 *
 * Con un sprite del catálogo es más simple: son PNG con transparencia, así
 * que se dibujan tal cual, sin blend ni animación.
 */
export function CarLoop({
  className = '',
  sprite = null,
}: {
  className?: string
  sprite?: SpriteVehiculo | null
}) {
  const [animar, setAnimar] = useState(false)

  useEffect(() => {
    // Un sprite del catálogo no tiene loop que reproducir.
    if (sprite) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    // Con datos móviles o conexión lenta no bajamos 3 MB por decoración.
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }).connection
    if (conn?.saveData) return
    if (conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return

    setAnimar(true)
  }, [sprite])

  if (sprite) {
    // Sin medidas declaradas: los sprites del catálogo no comparten
    // proporción (el i20 de rally es 348×126, los de calle 144×88) y fijar
    // una los deformaría. Un <img> toma la del archivo. Son PNG chicos y
    // decorativos, así que la optimización de next/image no aporta nada.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaUrl(sprite.url)}
        alt=""
        aria-hidden="true"
        className={className}
        style={{ imageRendering: 'pixelated' }}
      />
    )
  }

  if (!animar) {
    return (
      <Image
        src={I20_RALLY.still}
        alt=""
        aria-hidden="true"
        width={I20_RALLY.ancho}
        height={I20_RALLY.alto}
        className={className}
        style={{ imageRendering: 'pixelated' }}
        unoptimized
      />
    )
  }

  // Nada de envolverlo en un contenedor con fondo propio: `mix-blend-mode`
  // mezcla contra su contexto de apilamiento, así que el envoltorio se vería
  // como una caja oscura recortada sobre la cabecera. El video mezcla directo
  // contra el degradado.
  return (
    <video
      src={I20_RALLY.loop}
      poster={I20_RALLY.poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      className={className}
      style={{ mixBlendMode: 'screen' }}
      onError={() => setAnimar(false)}
    />
  )
}
