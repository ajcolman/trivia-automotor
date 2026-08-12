// Author: Angel Colman
'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trophy, X } from 'lucide-react'

export interface FilaRankingPublica {
  nombre: string
  puntos: number
  /** Texto secundario: porcentaje, cantidad de aciertos, lo que aplique. */
  detalle?: string
}

const MEDALLAS = ['🥇', '🥈', '🥉']

/**
 * Botón que abre la tabla de posiciones de un juego.
 *
 * Vive dentro del gabinete del arcade, junto al CTA. Se abre en un diálogo en
 * lugar de llevar a otra página: mirar quién va ganando no debería sacarte de
 * la sala de juegos.
 */
export function RankingModal({
  titulo,
  filas,
  colorAcento,
}: {
  titulo: string
  filas: FilaRankingPublica[]
  /** Color del juego, para el puntaje. */
  colorAcento?: string
}) {
  const [abierto, setAbierto] = useState(false)
  // El gabinete se levanta en hover con `transform`, y un transform convierte
  // al ancestro en bloque contenedor de los `fixed`: sin portal el diálogo
  // quedaría encerrado (y recortado) dentro de la máquina.
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])
  const origenRef = useRef<HTMLButtonElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('keydown', onKey)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cerrarRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previo
      origenRef.current?.focus()
    }
  }, [abierto])

  return (
    <>
      <button
        ref={origenRef}
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-[48px] flex-shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 text-xs font-bold text-automotor-200 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300 focus-visible:ring-offset-2 focus-visible:ring-offset-automotor-900 motion-reduce:transition-none"
      >
        <Trophy className="h-4 w-4" aria-hidden="true" />
        Ranking
      </button>

      {abierto && montado && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ranking de ${titulo}`}
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
        >
          <button
            type="button"
            aria-label="Cerrar"
            tabIndex={-1}
            className="absolute inset-0 bg-automotor-950/85 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
          />

          <div className="relative flex max-h-[80vh] w-full flex-col rounded-t-3xl bg-white sm:max-w-md sm:rounded-3xl">
            <div className="flex items-start gap-3 border-b border-slate-100 p-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-expanded text-lg font-black leading-tight text-slate-900">
                  Ranking
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-500">{titulo}</p>
              </div>
              <button
                ref={cerrarRef}
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="-mr-1 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {filas.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Todavía no hay puntajes. Sé el primero en jugar.
              </p>
            ) : (
              <ol className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
                {filas.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-7 flex-shrink-0 text-center text-lg leading-none">
                      {i < 3 ? MEDALLAS[i] : (
                        <span className="text-xs font-bold text-slate-400 tabular-nums">{i + 1}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {f.nombre}
                      </span>
                      {f.detalle && (
                        <span className="block truncate text-xs text-slate-400">{f.detalle}</span>
                      )}
                    </span>
                    <span
                      className="text-sm font-black tabular-nums"
                      style={{ color: colorAcento ?? '#005CA8' }}
                    >
                      {f.puntos.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
