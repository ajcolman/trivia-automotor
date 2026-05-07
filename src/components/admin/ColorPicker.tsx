// Author: Angel Colman
'use client'

import { useState } from 'react'
import { Trophy, Play } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isValidHexColor } from '@/lib/utils'

const PRESETS = [
  { name: 'Automotor Azul', primary: '#003087', secondary: '#002060', accent: '#F97316', bg: '#F8FAFC', text: '#1A1A2E' },
  { name: 'Hyundai Dark', primary: '#002C5F', secondary: '#00AAD2', accent: '#FFFFFF', bg: '#0F1923', text: '#FFFFFF' },
  { name: 'Sport Rojo', primary: '#C41E3A', secondary: '#8B0000', accent: '#FF6B35', bg: '#FFF8F6', text: '#1A0A0A' },
  { name: 'Elegante Oscuro', primary: '#1A1A2E', secondary: '#16213E', accent: '#E94560', bg: '#0F3460', text: '#FFFFFF' },
  { name: 'Minimalista', primary: '#2563EB', secondary: '#1D4ED8', accent: '#F59E0B', bg: '#FFFFFF', text: '#1E293B' },
]

interface ColorPickerProps {
  value: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    textColor: string
  }
  onChange: (colors: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    textColor: string
  }) => void
}

const SLOTS = [
  { key: 'primaryColor' as const, label: 'Color Primario', hint: 'Header, botones principales' },
  { key: 'secondaryColor' as const, label: 'Color Secundario', hint: 'Degradado del header' },
  { key: 'accentColor' as const, label: 'Color Acento', hint: 'Elementos destacados' },
  { key: 'backgroundColor' as const, label: 'Fondo', hint: 'Fondo general' },
  { key: 'textColor' as const, label: 'Texto', hint: 'Color del texto principal' },
]

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [hexInputs, setHexInputs] = useState(value)

  const update = (key: keyof typeof value, color: string) => {
    const newVal = { ...hexInputs, [key]: color }
    setHexInputs(newVal)
    if (isValidHexColor(color)) onChange(newVal)
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Presets */}
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
            Paletas Predefinidas
          </Label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  const colors = {
                    primaryColor: preset.primary,
                    secondaryColor: preset.secondary,
                    accentColor: preset.accent,
                    backgroundColor: preset.bg,
                    textColor: preset.text,
                  }
                  setHexInputs(colors)
                  onChange(colors)
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium hover:border-blue-400 transition-colors"
                style={{ borderColor: preset.primary + '40' }}
              >
                <div className="flex">
                  {[preset.primary, preset.secondary, preset.accent].map((c, i) => (
                    <div key={i} className="w-3 h-3 rounded-full border border-white/50" style={{ backgroundColor: c, marginLeft: i > 0 ? -4 : 0 }} />
                  ))}
                </div>
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Individual slots */}
        {SLOTS.map(slot => (
          <div key={slot.key} className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={hexInputs[slot.key]}
                onChange={e => update(slot.key, e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-200 p-0.5"
              />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-semibold text-slate-700 mb-0.5 block">{slot.label}</Label>
              <p className="text-xs text-slate-400 mb-1">{slot.hint}</p>
              <Input
                type="text"
                value={hexInputs[slot.key]}
                onChange={e => update(slot.key, e.target.value)}
                maxLength={7}
                className={`h-8 text-sm font-mono ${!isValidHexColor(hexInputs[slot.key]) ? 'border-red-400' : ''}`}
                placeholder="#000000"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-4">
        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
          Vista Previa
        </Label>
        <div
          className="rounded-2xl overflow-hidden shadow-lg border"
          style={{ backgroundColor: hexInputs.backgroundColor }}
        >
          <div
            className="p-6 text-white text-center"
            style={{ background: `linear-gradient(135deg, ${hexInputs.primaryColor}, ${hexInputs.secondaryColor})` }}
          >
            <Trophy className="w-10 h-10 mx-auto mb-2" style={{ color: hexInputs.accentColor }} />
            <div className="text-lg font-black">Tu Trivia</div>
            <div className="text-sm opacity-80">Vista previa de colores</div>
          </div>
          <div className="p-4 space-y-3">
            <div
              className="p-3 rounded-xl border-2 text-sm"
              style={{ borderColor: `${hexInputs.primaryColor}30`, color: hexInputs.textColor }}
            >
              Opción A de respuesta
            </div>
            <div
              className="p-3 rounded-xl border-2 text-sm font-bold"
              style={{ backgroundColor: '#dcfce7', borderColor: '#22c55e', color: '#166534' }}
            >
              ✓ Respuesta correcta
            </div>
            <button
              className="w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${hexInputs.primaryColor}, ${hexInputs.secondaryColor})` }}
            >
              <Play className="w-4 h-4 inline mr-2 fill-current" />
              Comenzar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
