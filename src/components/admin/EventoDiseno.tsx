// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Palette } from 'lucide-react'
import { ColorPicker } from './ColorPicker'

interface Colores {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
}

interface Props {
  eventoId: string
  colores: Colores
}

/**
 * Paleta de colores del evento de predicción.
 *
 * Mismos cinco campos que una trivia (ver ColorPicker.tsx / TriviaEditor.tsx):
 * esta es la paridad que le faltaba al panel de predicciones -- antes esos
 * tres colores solo existían con el valor por defecto del sembrado, sin
 * ninguna pantalla para cambiarlos.
 */
export function EventoDiseno({ eventoId, colores: colsIniciales }: Props) {
  const router = useRouter()
  const [colores, setColores] = useState<Colores>(colsIniciales)
  const [guardando, setGuardando] = useState(false)

  const hayCambios = COLOR_KEYS.some(k => colores[k] !== colsIniciales[k])

  async function guardar() {
    setGuardando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colors: colores }),
    })
    setGuardando(false)
    if (res.ok) {
      toast.success('Paleta actualizada')
      router.refresh()
    } else {
      toast.error((await res.json().catch(() => ({})))?.error ?? 'No se pudo guardar la paleta')
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
          <Palette className="h-4 w-4" /> Paleta de colores
        </h2>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !hayCambios}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#005CA8] px-4 py-2 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Guardar paleta
        </button>
      </div>
      <ColorPicker value={colores} onChange={setColores} />
    </section>
  )
}

const COLOR_KEYS: (keyof Colores)[] = ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'textColor']
