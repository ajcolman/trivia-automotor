// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

/**
 * El i20 en 8 bits, animado.
 *
 * El video viene con fondo negro y el MP4 no admite canal alfa, así que en
 * lugar de transcodificar usamos `mix-blend-mode: screen`: sobre el azul
 * profundo de la plataforma el negro se vuelve invisible y el auto queda
 * recortado. Medido, el fondo es negro casi puro (1,1,1), que es lo que hace
 * que el truco funcione limpio.
 *
 * Cae a la imagen fija cuando el visitante pidió menos movimiento, y también
 * mientras el video no cargó: nunca hay un hueco vacío.
 */
export function CarLoop({ className = '' }: { className?: string }) {
  const [animar, setAnimar] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    // Con datos móviles o conexión lenta no bajamos 3 MB por decoración.
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }).connection
    if (conn?.saveData) return
    if (conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return

    setAnimar(true)
  }, [])

  if (!animar) {
    return (
      <Image
        src="/sprites/i20n-rally-8bit.png"
        alt=""
        aria-hidden="true"
        width={348}
        height={126}
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
      src="/sprites/i20n-rally-loop.mp4"
      poster="/sprites/i20n-rally-8bit.png"
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
