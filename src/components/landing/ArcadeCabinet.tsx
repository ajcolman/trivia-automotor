// Author: Angel Colman
import type { ReactNode } from 'react'

/**
 * Marco de máquina arcade para la sala de juegos de la landing.
 *
 * La regla de la plataforma aplicada al mueble: el gabinete (marquesina,
 * bordes, base) es siempre chrome de Automotor Play -- navy uniforme, tipo de
 * juego en la marquesina con su acento fijo --, y la "pantalla" es el único
 * lugar donde mandan los colores del juego (degradado configurado, flyer,
 * video). Así dos máquinas de tipos distintos se leen como tipos distintos
 * de un vistazo, y dos trivias con paletas distintas siguen siendo hermanas.
 *
 * Es un <li>: la sala que lo contiene debe ser un <ul>. No es un link -- el
 * CTA vive en la base, dentro de `children`, para no anidar botones (como el
 * modal de premios) dentro de un <a>.
 */
export function ArcadeCabinet({
  typeLabel,
  typeAccent,
  typeIcon,
  badge,
  screen,
  dimmed = false,
  children,
}: {
  /** Nombre del tipo de juego en la marquesina: "Trivia", "Predicciones"... */
  typeLabel: string
  /** Clase de color del acento del tipo (fijo por tipo, no por juego). */
  typeAccent: string
  typeIcon: ReactNode
  /** Chip a la derecha de la marquesina: "En vivo", "hasta 12/10"... */
  badge?: ReactNode
  /** Contenido de la pantalla. Trae su propio fondo; acá solo se recorta. */
  screen: ReactNode
  /** Gabinete apagado ("Próximamente"): sin hover, atenuado. */
  dimmed?: boolean
  children: ReactNode
}) {
  return (
    <li
      className={`group relative flex w-full max-w-[22rem] flex-col overflow-hidden rounded-2xl bg-automotor-900/80 shadow-xl shadow-automotor-950/60 ${
        dimmed
          ? 'opacity-60 ring-1 ring-white/10 [&_*]:!transition-none'
          : 'ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-2xl motion-reduce:transition-none motion-reduce:hover:translate-y-0'
      }`}
    >
      {/* ── Marquesina: el tipo de juego, en chrome de plataforma ── */}
      <div className="flex min-h-[40px] items-center justify-between gap-2 border-b border-white/10 bg-automotor-950/60 px-4 py-2">
        <span className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${typeAccent}`}>
          {typeIcon}
          {typeLabel}
        </span>
        {badge}
      </div>

      {/* ── Pantalla: acá mandan los colores del juego ── */}
      <div className="relative mx-3 mt-3 overflow-hidden rounded-xl ring-1 ring-white/10">
        {screen}
        {/* Scanlines, las mismas del hero: continuidad retro sin peso extra */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
          }}
        />
      </div>

      {/* ── Base: descripción, premios, CTA ── */}
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </li>
  )
}
