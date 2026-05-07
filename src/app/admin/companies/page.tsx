// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { slugify } from '@/lib/utils'
import { UploadDropzone } from '@/components/admin/UploadDropzone'

interface Company {
  id: string; name: string; slug: string; logoUrl: string | null
  description: string | null; website: string | null; isActive: boolean
  _count: { brands: number; trivias: number; users: number }
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', website: '', logoUrl: '' as string, isActive: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const load = async () => {
    const res = await fetch('/api/admin/companies')
    setCompanies(await res.json())
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', slug: '', description: '', website: '', logoUrl: '', isActive: true })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (c: Company) => {
    setEditing(c)
    setForm({ name: c.name, slug: c.slug, description: c.description ?? '', website: c.website ?? '', logoUrl: c.logoUrl ?? '', isActive: c.isActive })
    setErrors({})
    setDialogOpen(true)
  }

  const save = async () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio'
    if (!form.slug.trim()) newErrors.slug = 'El slug es obligatorio'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setSaving(true)
    const url = editing ? `/api/admin/companies/${editing.id}` : '/api/admin/companies'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setDialogOpen(false); load() }
    else { const d = await res.json(); alert(d.error) }
    setSaving(false)
  }

  const deleteCompany = async (id: string) => {
    if (!confirm('¿Eliminar empresa? Se eliminarán también sus marcas.')) return
    await fetch(`/api/admin/companies/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">Empresas</h1>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nueva Empresa
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(c => (
          <Card key={c.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    {c.logoUrl
                      ? <img src={c.logoUrl} alt={c.name} className="w-8 h-8 object-contain" />
                      : <Building2 className="w-5 h-5 text-blue-600" />
                    }
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{c.name}</h3>
                    <p className="text-xs text-slate-400">/{c.slug}</p>
                  </div>
                </div>
                <Badge className={c.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                  {c.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              {c.description && <p className="text-sm text-slate-500 mb-3">{c.description}</p>}
              <div className="flex gap-3 text-xs text-slate-400 mb-3">
                <span>{c._count.brands} marcas</span>
                <span>{c._count.trivias} trivias</span>
                <span>{c._count.users} usuarios</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="flex-1">
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => deleteCompany(c.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className={errors.name ? 'text-red-500' : ''}>Nombre *</Label>
              <Input 
                value={form.name} 
                onChange={e => { 
                  setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) })) 
                  if (e.target.value.trim()) setErrors(errs => { const { name, slug, ...rest } = errs; return rest })
                }} 
                aria-invalid={!!errors.name}
                className="mt-1" 
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label className={errors.slug ? 'text-red-500' : ''}>Slug *</Label>
              <Input 
                value={form.slug} 
                onChange={e => {
                  setForm(f => ({ ...f, slug: e.target.value }))
                  if (e.target.value.trim()) setErrors(errs => { const { slug, ...rest } = errs; return rest })
                }} 
                aria-invalid={!!errors.slug}
                className="mt-1" 
              />
              {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
            </div>
            <div>
              <Label>Logo</Label>
              <div className="mt-1">
                <UploadDropzone value={form.logoUrl} onUpload={url => setForm(f => ({ ...f, logoUrl: url }))} />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Sitio web</Label>
              <Input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="mt-1" placeholder="https://..." />
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
