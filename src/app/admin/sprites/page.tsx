// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { UploadDropzone } from '@/components/admin/UploadDropzone'
import { MEDIDAS } from '@/lib/medidas-imagen'
import { toast } from 'sonner'

interface Brand {
  id: string
  name: string
  models: string[]
}

interface VehicleSprite {
  id: string
  spriteUrl: string
  loopUrl: string | null
  posterUrl: string | null
  blackBackground: boolean
  brandId: string | null
  modelName: string | null
  isGeneric: boolean
  genericType: string | null
  createdAt: string
  brand: { id: string; name: string } | null
}

const GENERIC_TYPES = [
  { value: 'sedan', label: 'Sedán' },
  { value: 'truck', label: 'Camioneta' },
  { value: 'suv', label: 'SUV' },
]

const defaultForm = {
  brandId: '',
  modelName: '',
  spriteUrl: '',
  loopUrl: '',
  posterUrl: '',
  blackBackground: false,
  isGeneric: false,
  genericType: 'sedan' as 'sedan' | 'truck' | 'suv',
}

export default function SpritesPage() {
  const [sprites, setSprites] = useState<VehicleSprite[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    const [s, b] = await Promise.all([
      fetch('/api/admin/sprites'),
      fetch('/api/admin/brands'),
    ])
    if (s.ok) setSprites(await s.json())
    if (b.ok) setBrands(await b.json())
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm(defaultForm)
    setErrors({})
    setDialogOpen(true)
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.spriteUrl.trim()) newErrors.spriteUrl = 'La URL del sprite es obligatoria'
    if (!form.isGeneric && !form.brandId) newErrors.brandId = 'Debes seleccionar una marca'
    if (!form.isGeneric && !form.modelName.trim()) newErrors.modelName = 'El nombre del modelo es obligatorio'
    return newErrors
  }

  const save = async () => {
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setSaving(true)

    const payload = {
      spriteUrl: form.spriteUrl.trim(),
      loopUrl: form.loopUrl.trim() || null,
      posterUrl: form.posterUrl.trim() || null,
      blackBackground: form.blackBackground,
      isGeneric: form.isGeneric,
      brandId: form.isGeneric ? null : form.brandId || null,
      modelName: form.isGeneric ? null : form.modelName.trim() || null,
      genericType: form.isGeneric ? form.genericType : null,
    }

    const res = await fetch('/api/admin/sprites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setDialogOpen(false)
      toast.success('Sprite creado')
      load()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Error al crear el sprite')
    }
    setSaving(false)
  }

  const deleteSprite = async (id: string) => {
    const res = await fetch(`/api/admin/sprites/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Sprite eliminado')
      load()
    } else {
      toast.error('Error al eliminar el sprite')
    }
  }

  const genericLabel = (type: string | null) => {
    return GENERIC_TYPES.find(t => t.value === type)?.label ?? type ?? '—'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">Sprites de Vehículos</h1>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Sprite
        </Button>
      </div>

      {sprites.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <ImageOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay sprites registrados</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sprites.map(sprite => (
          <Card key={sprite.id} className="border-0 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center gap-3">
              {/* El que viene sobre negro se muestra en una baldosa oscura y
                  recortado con blend: sobre el gris claro sería una caja
                  negra, y el blend sobre claro lo borraría entero. */}
              <div
                className={`w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden ${
                  sprite.blackBackground ? 'bg-automotor-950' : 'bg-slate-100'
                }`}
              >
                {sprite.spriteUrl ? (
                  <img
                    src={sprite.posterUrl || sprite.spriteUrl}
                    alt={sprite.modelName ?? sprite.genericType ?? 'sprite'}
                    className="w-12 h-12 object-contain"
                    style={{
                      imageRendering: 'pixelated',
                      ...(sprite.blackBackground ? { mixBlendMode: 'screen' as const } : {}),
                    }}
                  />
                ) : (
                  <ImageOff className="w-6 h-6 text-slate-300" />
                )}
              </div>

              <div className="text-center w-full">
                {sprite.isGeneric ? (
                  <Badge className="bg-purple-100 text-purple-700 border-0 text-xs mb-1">
                    Genérico
                  </Badge>
                ) : (
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {sprite.brand?.name ?? '—'}
                  </p>
                )}
                <p className="text-xs text-slate-500 truncate">
                  {sprite.isGeneric ? genericLabel(sprite.genericType) : (sprite.modelName ?? '—')}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-600 hover:bg-red-50 w-full"
                onClick={() => setDeleteId(sprite.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Eliminar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Sprite</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Generic toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isGeneric}
                  onChange={e => {
                    setForm(f => ({ ...f, isGeneric: e.target.checked, brandId: '', modelName: '' }))
                    setErrors({})
                  }}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Sprite genérico</span>
              </label>
            </div>

            {/* Brand or generic type */}
            {form.isGeneric ? (
              <div>
                <Label>Tipo genérico</Label>
                <select
                  value={form.genericType}
                  onChange={e => setForm(f => ({ ...f, genericType: e.target.value as typeof form.genericType }))}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {GENERIC_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <Label className={errors.brandId ? 'text-red-500' : ''}>Marca *</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      options={brands.map(b => ({ value: b.id, label: b.name }))}
                      value={form.brandId}
                      onChange={val => {
                        setForm(f => ({ ...f, brandId: val, modelName: '' }))
                        if (val) setErrors(e => { const { brandId, ...rest } = e; return rest })
                      }}
                      placeholder="Seleccionar marca..."
                    />
                  </div>
                  {errors.brandId && <p className="text-xs text-red-500 mt-1">{errors.brandId}</p>}
                </div>

                <div>
                  <Label className={errors.modelName ? 'text-red-500' : ''}>Modelo *</Label>
                  {(() => {
                    const selectedBrand = brands.find(b => b.id === form.brandId)
                    const brandModels = selectedBrand?.models ?? []
                    return brandModels.length > 0 ? (
                      <select
                        value={form.modelName}
                        onChange={e => setForm(f => ({ ...f, modelName: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Seleccionar modelo —</option>
                        {brandModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={form.modelName}
                        onChange={e => {
                          setForm(f => ({ ...f, modelName: e.target.value }))
                          if (e.target.value.trim()) setErrors(err => { const { modelName, ...rest } = err; return rest })
                        }}
                        placeholder="Ej: Corolla"
                        aria-invalid={!!errors.modelName}
                        className="mt-1"
                      />
                    )
                  })()}
                  {errors.modelName && <p className="text-xs text-red-500 mt-1">{errors.modelName}</p>}
                </div>
              </>
            )}

            {/* Sprite: archivo o, si ya está publicado, su URL */}
            <div>
              <Label className={errors.spriteUrl ? 'text-red-500' : ''}>Sprite *</Label>
              <div className="mt-1">
                <UploadDropzone
                  medida={MEDIDAS.sprite}
                  value={form.spriteUrl || null}
                  onUpload={url => {
                    setForm(f => ({ ...f, spriteUrl: url }))
                    if (url.trim()) setErrors(err => { const { spriteUrl, ...rest } = err; return rest })
                  }}
                  label="Arrastrá el sprite o hacé clic"
                />
              </div>
              <Input
                value={form.spriteUrl}
                onChange={e => {
                  setForm(f => ({ ...f, spriteUrl: e.target.value }))
                  if (e.target.value.trim()) setErrors(err => { const { spriteUrl, ...rest } = err; return rest })
                }}
                placeholder="…o pegá una URL ya publicada"
                aria-invalid={!!errors.spriteUrl}
                className="mt-2"
              />
              {errors.spriteUrl && <p className="text-xs text-red-500 mt-1">{errors.spriteUrl}</p>}

              {/* Animación. Es opcional: el fútbol usa siempre la imagen
                  fija, y las predicciones reproducen el loop si está. */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                <p className="text-xs font-bold text-slate-500">Animación (opcional)</p>
                <div>
                  <Label className="text-xs">Video en loop</Label>
                  <Input
                    value={form.loopUrl}
                    onChange={e => setForm(f => ({ ...f, loopUrl: e.target.value }))}
                    placeholder="/sprites/mi-auto-loop.mp4"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Primer cuadro del loop</Label>
                  <Input
                    value={form.posterUrl}
                    onChange={e => setForm(f => ({ ...f, posterUrl: e.target.value }))}
                    placeholder="/sprites/mi-auto-poster.png"
                    className="mt-1"
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.blackBackground}
                    onChange={e => setForm(f => ({ ...f, blackBackground: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#005CA8]"
                  />
                  <span>
                    El archivo tiene fondo negro en vez de transparencia. Marcalo para los loops:
                    el MP4 no admite canal alfa, así que el negro se recorta mezclándolo contra el
                    fondo oscuro de la página.
                  </span>
                </label>
              </div>
              {form.spriteUrl && (
                <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <img
                    src={form.spriteUrl}
                    alt="preview"
                    className="w-10 h-10 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="text-xs text-slate-400">Vista previa</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="¿Eliminar sprite?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => { deleteSprite(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
