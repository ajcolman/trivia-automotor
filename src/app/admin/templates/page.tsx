// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Copy, Plus, Share2, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Template {
  id: string; title: string; description: string | null
  primaryColor: string; secondaryColor: string; accentColor: string
  isPublic: boolean; createdAt: string; ownerId?: string
  owner?: { name: string }
}

export default function TemplatesPage() {
  const [owned, setOwned] = useState<Template[]>([])
  const [shared, setShared] = useState<Template[]>([])
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sharingTemplate, setSharingTemplate] = useState<Template | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [sharing, setSharing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const router = useRouter()

  const load = async () => {
    const res = await fetch('/api/admin/templates')
    const data = await res.json()
    setOwned(data.owned ?? [])
    setShared(data.shared ?? [])
  }

  useEffect(() => { load() }, [])

  const useTemplate = async (template: Template) => {
    const res = await fetch('/api/admin/trivias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${template.title} (copia)`,
        slug: `${template.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`.slice(0, 60),
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        accentColor: template.accentColor,
      }),
    })
    if (res.ok) {
      const trivia = await res.json()
      router.push(`/admin/trivias/${trivia.id}`)
    }
  }

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' })
    toast.success('Plantilla eliminada')
    load()
  }

  const openShare = (t: Template) => { setSharingTemplate(t); setShareEmail(''); setShareDialogOpen(true) }

  const doShare = async () => {
    if (!sharingTemplate || !shareEmail) return
    setSharing(true)
    const usersRes = await fetch('/api/admin/users')
    const users = await usersRes.json()
    const user = users.find((u: any) => u.email === shareEmail)
    if (!user) { toast.error('Usuario no encontrado'); setSharing(false); return }

    const res = await fetch(`/api/admin/templates/${sharingTemplate.id}/share`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }),
    })
    if (res.ok) { setShareDialogOpen(false); toast.success('¡Plantilla compartida!') }
    else { const d = await res.json(); toast.error(d.error) }
    setSharing(false)
  }

  const TemplateCard = ({ t, isOwned }: { t: Template; isOwned: boolean }) => (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div
          className="h-12 rounded-xl mb-3 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${t.primaryColor}, ${t.secondaryColor})` }}
        >
          <span className="text-white font-bold text-sm">{t.title[0]}</span>
        </div>
        <h3 className="font-bold text-slate-800 text-sm mb-1">{t.title}</h3>
        {t.description && <p className="text-xs text-slate-400 mb-2 line-clamp-2">{t.description}</p>}
        {!isOwned && t.owner && <p className="text-xs text-slate-400 mb-2">De: {t.owner.name}</p>}
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => useTemplate(t)}>
            <Copy className="w-3 h-3 mr-1" /> Usar
          </Button>
          {isOwned && (
            <>
              <Button variant="ghost" size="sm" onClick={() => openShare(t)}>
                <Share2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400" onClick={() => setDeleteId(t.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">Plantillas</h1>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Mis Plantillas</h2>
        {owned.length === 0 ? (
          <p className="text-slate-400 text-sm">No tienes plantillas propias. Guarda una trivia como plantilla desde el editor.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {owned.map(t => <TemplateCard key={t.id} t={t} isOwned={true} />)}
          </div>
        )}
      </div>

      {shared.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Compartidas Conmigo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {shared.map(t => <TemplateCard key={t.id} t={t} isOwned={false} />)}
          </div>
        </div>
      )}

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Compartir Plantilla</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email del administrador</Label>
              <Input type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="admin@empresa.com" className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShareDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={doShare} disabled={sharing} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Compartir'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="¿Eliminar plantilla?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => { deleteTemplate(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
