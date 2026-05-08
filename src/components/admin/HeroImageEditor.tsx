// Author: Angel Colman
'use client'

import { useState, useRef, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { UploadDropzone } from './UploadDropzone'
import { Button } from '@/components/ui/button'
import { Move, Maximize, ZoomIn, RefreshCcw } from 'lucide-react'
import { mediaUrl } from '@/lib/utils'

interface HeroImageEditorProps {
  value: string
  settings: {
    zoom: number
    x: number
    y: number
    height: number
  }
  onChange: (url: string) => void
  onSettingsChange: (settings: any) => void
  primaryColor?: string
}

// x and y are background-position percentages (0–100), where 50/50 = center.
// zoom is a multiplier: 1 = cover, >1 = zoomed in.
function bgSize(zoom: number) {
  if (zoom <= 1) return 'cover'
  return `${zoom * 100}%`
}

export function HeroImageEditor({ value, settings, onChange, onSettingsChange, primaryColor = '#003087' }: HeroImageEditorProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, bgX: 50, bgY: 50 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!value) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ mouseX: e.clientX, mouseY: e.clientY, bgX: settings.x, bgY: settings.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !value || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // Dragging right pans the view right → shows more of the right side → increase x
    const dx = ((e.clientX - dragStart.mouseX) / rect.width) * 100
    const dy = ((e.clientY - dragStart.mouseY) / rect.height) * 100
    const newX = Math.max(0, Math.min(100, dragStart.bgX + dx))
    const newY = Math.max(0, Math.min(100, dragStart.bgY + dy))
    onSettingsChange({ ...settings, x: newX, y: newY })
  }

  const handleMouseUp = () => setIsDragging(false)

  useEffect(() => {
    const up = () => setIsDragging(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const resetSettings = () => {
    onSettingsChange({ zoom: 1, x: 50, y: 50, height: 640 })
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
                    <ZoomIn className="w-3 h-3" /> Zoom: {Math.round(settings.zoom * 100)}%
                  </Label>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={resetSettings}>
                    <RefreshCcw className="w-3 h-3 mr-1" /> Resetear
                  </Button>
                </div>
                <Slider
                  value={[settings.zoom]}
                  min={1}
                  max={3}
                  step={0.01}
                  onValueChange={([v]) => onSettingsChange({ ...settings, zoom: v })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <Maximize className="w-3 h-3" /> Altura de cabecera: {settings.height}px
                </Label>
                <Slider
                  value={[settings.height]}
                  min={200}
                  max={800}
                  step={10}
                  onValueChange={([v]) => onSettingsChange({ ...settings, height: v })}
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs">
                <Move className="w-4 h-4 flex-shrink-0" />
                <p>Haz clic y arrastra la imagen en la previsualización para posicionarla.</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">Previsualización en tiempo real</Label>
          <div
            className="relative w-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-200"
            style={{ height: `${settings.height * 0.6}px` }}
          >
            {value ? (
              <div
                ref={containerRef}
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${mediaUrl(value)})`,
                  backgroundSize: bgSize(settings.zoom),
                  backgroundPosition: `${settings.x}% ${settings.y}%`,
                  backgroundRepeat: 'no-repeat',
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                  <div className="h-4 w-3/4 bg-white/30 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-white/20 rounded" />
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
