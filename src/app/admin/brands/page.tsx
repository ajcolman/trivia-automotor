// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Car, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { UploadDropzone } from '@/components/admin/UploadDropzone'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Brand {
  id: string; name: string; companyId: string; logoUrl: string | null
  models: string[]; isActive: boolean
  company: { name: string }
}

interface Company { id: string; name: string }

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [saving, setSaving] = useState(false)
  const [modelInput, setModelInput] = useState('')
  const [form, setForm] = useState({ name: '', companyId: '', logoUrl: '' as string, models: [] as string[], isActive: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const load = async () => {
    const [b, c] = await Promise.all([fetch('/api/admin/brands'), fetch('/api/admin/companies')])
    setBrands(await b.json())
    setCompanies(await c.json())
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', companyId: companies[0]?.id ?? '', logoUrl: '', models: [], isActive: true })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (b: Brand) => {
    setEditing(b)
    setForm({ name: b.name, companyId: b.companyId, logoUrl: b.logoUrl ?? '', models: b.models, isActive: b.isActive })
    setErrors({})
    setDialogOpen(true)
  }

  const addModel = () => {
    if (modelInput.trim() && !form.models.includes(modelInput.trim())) {
      setForm(f => ({ ...f, models: [...f.models, modelInput.trim()] }))
      setModelInput('')
    }
  }

  const removeModel = (m: string) => setForm(f => ({ ...f, models: f.models.filter(x => x !== m) }))

  const save = async () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio'
    if (!form.companyId) newErrors.companyId = 'Debes seleccionar una empresa'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setSaving(true)
    const url = editing ? `/api/admin/brands/${editing.id}` : '/api/admin/brands'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setDialogOpen(false); load() }
    else { const d = await res.json(); alert(d.error) }
    setSaving(false)
  }

  const deleteBrand = async (id: string) => {
    if (!confirm('¿Eliminar esta marca?')) return
    await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">Marcas</h1>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nueva Marca
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map(b => (
          <Card key={b.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    {b.logoUrl ? <img src={b.logoUrl} alt={b.name} className="w-8 h-8 object-contain" /> : <Car className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{b.name}</h3>
                    <p className="text-xs text-slate-400">{b.company.name}</p>
                  </div>
                </div>
                <Badge className={b.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                  {b.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {(b.models as string[]).map(m => (
                  <span key={m} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(b)} className="flex-1">
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="text-red-400" onClick={() => deleteBrand(b.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className={errors.companyId ? 'text-red-500' : ''}>Empresa *</Label>
              <div className="mt-1">
                <SearchableSelect
                  options={companies.map(c => ({ value: c.id, label: c.name }))}
                  value={form.companyId}
                  onChange={val => {
                    setForm(f => ({ ...f, companyId: val }))
                    if (val) setErrors(e => { const { companyId, ...rest } = e; return rest })
                  }}
                  placeholder="Seleccionar empresa..."
                />
              </div>
              {errors.companyId && <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>}
            </div>
            <div>
              <Label className={errors.name ? 'text-red-500' : ''}>Nombre *</Label>
              <Input 
                value={form.name} 
                onChange={e => {
                  setForm(f => ({ ...f, name: e.target.value }))
                  if (e.target.value.trim()) setErrors(err => { const { name, ...rest } = err; return rest })
                }} 
                aria-invalid={!!errors.name}
                className="mt-1" 
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div><Label>Logo</Label><div className="mt-1"><UploadDropzone value={form.logoUrl} onUpload={url => setForm(f => ({ ...f, logoUrl: url }))} /></div></div>
            <div>
              <Label>Modelos de vehículos</Label>
              <div className="flex gap-2 mt-1">
                <Input value={modelInput} onChange={e => setModelInput(e.target.value)} placeholder="HB20" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addModel())} />
                <Button type="button" variant="outline" onClick={addModel}>Agregar</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.models.map(m => (
                  <span key={m} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {m}
                    <button onClick={() => removeModel(m)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
