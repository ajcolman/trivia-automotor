// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

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
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'admin', companyId: '', isActive: true })

  const load = async () => {
    const [u, c] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/companies')])
    setUsers(await u.json())
    setCompanies(await c.json())
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ email: '', name: '', password: '', role: 'admin', companyId: '', isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (u: UserData) => {
    setEditing(u)
    setForm({ email: u.email, name: u.name, password: '', role: u.role, companyId: u.companyId ?? '', isActive: u.isActive })
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    const url = editing ? `/api/admin/users/${editing.id}` : '/api/admin/users'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, companyId: form.companyId || null }) })
    if (res.ok) { setDialogOpen(false); load() }
    else { const d = await res.json(); alert(d.error) }
    setSaving(false)
  }

  const deleteUser = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
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
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => deleteUser(u.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" disabled={!!editing} /></div>
            <div><Label>{editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="mt-1" /></div>
            <div><Label>Rol</Label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-white">
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div><Label>Empresa</Label>
              <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-white">
                <option value="">Sin empresa (acceso total)</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} id="active" />
              <Label htmlFor="active">Usuario activo</Label>
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
