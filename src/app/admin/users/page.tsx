// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Shield, User, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, updateUserSchema } from '@/lib/validations/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface UserData {
  id: string; email: string; name: string; role: string
  isActive: boolean; companyId: string | null; createdAt: string
  company: { name: string } | null
}

interface Company { id: string; name: string }

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<any>({
    resolver: zodResolver(editing ? updateUserSchema : createUserSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  const load = async () => {
    const [u, c] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/companies')])
    setUsers(await u.json())
    setCompanies(await c.json())
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    reset({ email: '', name: '', password: '', role: 'admin', companyId: '', isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (u: UserData) => {
    setEditing(u)
    reset({ email: u.email, name: u.name, password: '', role: u.role, companyId: u.companyId ?? '', isActive: u.isActive })
    setDialogOpen(true)
  }

  const onSave = handleSubmit(async (data) => {
    setSaving(true)
    const url = editing ? `/api/admin/users/${editing.id}` : '/api/admin/users'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { 
      method, 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...data, companyId: data.companyId || null }) 
    })
    
    if (res.ok) {
      setDialogOpen(false)
      toast.success(editing ? 'Usuario actualizado' : 'Usuario creado')
      load()
    } else {
      const d = await res.json()
      toast.error(d.error || 'Error al guardar')
    }
    setSaving(false)
  })

  const deleteUser = async (id: string) => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    toast.success('Usuario eliminado')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">Usuarios</h1>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={u.role === 'super_admin' ? 'bg-purple-100 text-purple-700 border-0' : 'bg-blue-100 text-blue-700 border-0'}>
                      {u.role === 'super_admin' ? <Shield className="w-3 h-3 inline mr-1" /> : <User className="w-3 h-3 inline mr-1" />}
                      {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.company?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={u.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(u.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} key={editing?.id ?? 'create'}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <Label className={errors.name ? 'text-red-500' : ''}>Nombre *</Label>
              <Input value={watch('name') ?? ''} onChange={e => setValue('name', e.target.value, { shouldValidate: true })} className="mt-1" aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {String(errors.name.message)}</p>}
            </div>

            <div>
              <Label className={errors.email ? 'text-red-500' : ''}>Email *</Label>
              <Input type="email" value={watch('email') ?? ''} onChange={e => setValue('email', e.target.value, { shouldValidate: true })} className="mt-1" disabled={!!editing} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {String(errors.email.message)}</p>}
            </div>

            <div>
              <Label className={errors.password ? 'text-red-500' : ''}>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</Label>
              <Input type="password" value={watch('password') ?? ''} onChange={e => setValue('password', e.target.value, { shouldValidate: true })} className="mt-1" aria-invalid={!!errors.password} />
              {errors.password && <div className="text-xs text-red-500 mt-1 space-y-1">
                {String(errors.password.message).split(',').map((msg, i) => (
                  <p key={i} className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {msg}</p>
                ))}
              </div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rol</Label>
                <div className="mt-1">
                  <SearchableSelect
                    options={[
                      { value: 'admin', label: 'Admin' },
                      { value: 'super_admin', label: 'Super Admin' },
                    ]}
                    value={watch('role')}
                    onChange={val => setValue('role', val)}
                  />
                </div>
              </div>

              <div>
                <Label className={errors.companyId ? 'text-red-500' : ''}>Empresa</Label>
                <div className="mt-1">
                  <SearchableSelect
                    options={[
                      { value: '', label: 'Sin empresa' },
                      ...companies.map(c => ({ value: c.id, label: c.name })),
                    ]}
                    value={watch('companyId')}
                    onChange={val => setValue('companyId', val, { shouldValidate: true })}
                    placeholder="Sin empresa"
                  />
                </div>
                {errors.companyId && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {String(errors.companyId.message)}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox" 
                id="active" 
                className="w-4 h-4 rounded border-slate-300"
                checked={watch('isActive')} 
                onChange={e => setValue('isActive', e.target.checked)} 
              />
              <Label htmlFor="active" className="cursor-pointer">Usuario activo</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="¿Eliminar usuario?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => { deleteUser(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
