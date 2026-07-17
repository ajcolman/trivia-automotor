// Author: Angel Colman
'use client'

import { useState, useRef, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { UploadDropzone } from './UploadDropzone'
import { Button } from '@/components/ui/button'
import { Eye, Maximize, Move, MoveHorizontal, MoveVertical, RefreshCcw, Type, ZoomIn } from 'lucide-react'
import { mediaUrl } from '@/lib/utils'
import {
  type HeroImageSettings,
  defaultHeroImageSettings,
  heroBackgroundImageStyle,
  heroOverlayGradient,
  heroTextOutlineStyle,
  resolveHeroImageSettings,
} from '@/lib/hero-image'

interface HeroImageEditorProps {
  value: string
  settings: HeroImageSettings
  onChange: (url: string) => void
  onSettingsChange: (settings: HeroImageSettings) => void
  primaryColor?: string
}

export function HeroImageEditor({ value, settings, onChange, onSettingsChange, primaryColor = '#003087' }: HeroImageEditorProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, bgX: 50, bgY: 50 })
  const containerRef = useRef<HTMLDivElement>(null)
  const heroSettings = resolveHeroImageSettings(settings, settings?.height ?? 400)

  const updateSettings = (patch: Partial<HeroImageSettings>) => {
    onSettingsChange({ ...heroSettings, ...patch })
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!value) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    setDragStart({ mouseX: e.clientX, mouseY: e.clientY, bgX: heroSettings.x, bgY: heroSettings.y })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !value || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - dragStart.mouseX) / rect.width) * 100
    const dy = ((e.clientY - dragStart.mouseY) / rect.height) * 100
    const newX = Math.max(0, Math.min(100, dragStart.bgX + dx))
    const newY = Math.max(0, Math.min(100, dragStart.bgY + dy))
    updateSettings({ x: newX, y: newY })
  }

  const handlePointerUp = () => setIsDragging(false)

  useEffect(() => {
    const up = () => setIsDragging(false)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const resetSettings = () => {
    onSettingsChange(defaultHeroImageSettings(640))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-bold">Imagen de Cabecera (Hero)</Label>
            <p className="text-xs text-slate-500 mb-3">Esta imagen aparecerá de fondo en la parte superior de la trivia.</p>
            <UploadDropzone
              value={value}
              onUpload={onChange}
              label="Subir fondo de cabecera"
            />
          </div>

          {value && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" /> Zoom: {Math.round(heroSettings.zoom * 100)}%
                  </Label>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={resetSettings}>
                    <RefreshCcw className="w-3 h-3 mr-1" /> Resetear
                  </Button>
                </div>
                <Slider
                  value={[heroSettings.zoom]}
                  min={1}
                  max={3}
                  step={0.01}
                  onValueChange={([v]) => updateSettings({ zoom: v })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <MoveHorizontal className="w-3 h-3" /> Horizontal: {Math.round(heroSettings.x)}%
                  </Label>
                  <Slider
                    value={[heroSettings.x]}
                    min={0}
                    max={100}
                    step={0.1}
                    onValueChange={([v]) => updateSettings({ x: v })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <MoveVertical className="w-3 h-3" /> Vertical: {Math.round(heroSettings.y)}%
                  </Label>
                  <Slider
                    value={[heroSettings.y]}
                    min={0}
                    max={100}
                    step={0.1}
                    onValueChange={([v]) => updateSettings({ y: v })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <Maximize className="w-3 h-3" /> Altura de cabecera: {heroSettings.height}px
                </Label>
                <Slider
                  value={[heroSettings.height]}
                  min={200}
                  max={800}
                  step={10}
                  onValueChange={([v]) => updateSettings({ height: v })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Oscurecer imagen: {Math.round(heroSettings.overlayOpacity ?? 55)}%
                  </Label>
                  <Slider
                    value={[heroSettings.overlayOpacity ?? 55]}
                    min={0}
                    max={90}
                    step={1}
                    onValueChange={([v]) => updateSettings({ overlayOpacity: v })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Type className="w-3 h-3" /> Borde del texto: {(heroSettings.textStroke ?? 1).toFixed(1)}px
                  </Label>
                  <Slider
                    value={[heroSettings.textStroke ?? 1]}
                    min={0}
                    max={4}
                    step={0.1}
                    onValueChange={([v]) => updateSettings({ textStroke: v })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs">
                <Move className="w-4 h-4 flex-shrink-0" />
                <p>Arrastra la imagen o usa los controles horizontal y vertical para ajustar el encuadre.</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">Previsualización en tiempo real</Label>
          <div
            className="relative w-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-200"
            style={{ height: `${heroSettings.height * 0.6}px` }}
          >
            {value ? (
              <div
                ref={containerRef}
                className="absolute inset-0 overflow-hidden touch-none"
                style={{
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={heroBackgroundImageStyle(heroSettings, mediaUrl(value))}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: heroOverlayGradient(heroSettings) }}
                />
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                  <p className="text-lg font-black text-white leading-tight" style={heroTextOutlineStyle(heroSettings)}>
                    Titulo de la trivia
                  </p>
                  <p className="mt-1 text-xs text-white/80 leading-snug" style={heroTextOutlineStyle(heroSettings, 0.45)}>
                    Texto de ejemplo sobre la imagen de cabecera
                  </p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Maximize className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-xs font-medium">Sube una imagen para ver la previa</p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 text-center italic">La previsualización está escalada al 60% del tamaño real.</p>
        </div>
      </div>
    </div>
  )
}
