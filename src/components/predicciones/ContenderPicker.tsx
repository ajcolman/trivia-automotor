// Author: Angel Colman
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Check, Star } from 'lucide-react'
import type { ContenderDTO } from './tipos'

interface Props {
  abierto: boolean
  titulo: string
  contenders: ContenderDTO[]
  /** Ya elegidos en otras posiciones del mismo mercado; se muestran deshabilitados. */
  bloqueados?: string[]
  seleccionado?: string | null
  onElegir: (contenderId: string) => void
  onCerrar: () => void
}

export function ContenderPicker({
  abierto, titulo, contenders, bloqueados = [], seleccionado, onElegir, onCerrar,
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    setBusqueda('')
    // Cerrar con Escape, como espera cualquier diálogo.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', onKey)
    // Evita que el fondo scrollee detrás de la hoja en móvil.
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previo
    }
  }, [abierto, onCerrar])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return contenders
    return contenders.filter(c =>
      [c.name, c.subtitle, c.teamName, c.number, c.category]
        .filter(Boolean)
        .some(campo => campo!.toLowerCase().includes(q)),
    )
  }, [busqueda, contenders])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <button
        type="button"
        className="absolute inset-0 bg-automotor-950/80 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onCerrar}
      />

      <div
        ref={panelRef}
        className="relative flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white sm:max-h-[70vh] sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-expanded text-lg font-black leading-tight text-slate-900">{titulo}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{contenders.length} tripulaciones</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="-mr-1 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-slate-100 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar piloto, equipo o número"
              aria-label="Buscar tripulación"
              className="min-h-[44px] w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-automotor-600 focus:outline-none"
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto overscroll-contain p-2">
          {filtrados.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-500">
              No encontramos ninguna tripulación con “{busqueda}”.
            </li>
          )}

          {filtrados.map(c => {
            const yaUsado = bloqueados.includes(c.id)
            const esElegido = seleccionado === c.id
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={yaUsado && !esElegido}
                  onClick={() => onElegir(c.id)}
                  className={`flex w-full min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors motion-reduce:transition-none
                    ${esElegido ? 'bg-automotor-600 text-white' : 'hover:bg-slate-50'}
                    ${yaUsado && !esElegido ? 'cursor-not-allowed opacity-40' : ''}
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300`}
                >
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-black tabular-nums
                      ${esElegido ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {c.number ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`flex items-center gap-1.5 truncate font-bold ${esElegido ? 'text-white' : 'text-slate-900'}`}>
                      {c.name}
                      {c.isFeatured && (
                        <Star
                          className={`h-3.5 w-3.5 flex-shrink-0 fill-current ${esElegido ? 'text-white' : 'text-brand-accent'}`}
                          aria-label="Corre en Hyundai"
                        />
                      )}
                    </span>
                    <span className={`block truncate text-xs ${esElegido ? 'text-white/70' : 'text-slate-500'}`}>
                      {c.category ?? c.teamName ?? c.subtitle}
                    </span>
                  </span>
                  {esElegido && <Check className="h-5 w-5 flex-shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
