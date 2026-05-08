// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Loader2, Trophy, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/utils'

interface Tournament {
  id: string
  name: string
  status: 'pending' | 'active' | 'finished'
  maxPlayers: number
  createdAt: string
  trivia: { id: string; title: string; slug: string } | null
  creator: { id: string; name: string; email: string }
  _count: { participants: number; matches: number }
}

function StatusBadge({ status }: { status: Tournament['status'] }) {
  if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-700 border-0">Pendiente</Badge>
  if (status === 'active') return <Badge className="bg-blue-100 text-blue-700 border-0">Activo</Badge>
  return <Badge className="bg-slate-100 text-slate-600 border-0">Finalizado</Badge>
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/tournaments')
      if (res.ok) setTournaments(await res.json())
      else toast.error('Error al cargar torneos')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const deleteTournament = async (id: string) => {
    const res = await fetch(`/api/admin/tournaments/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Torneo eliminado')
      load()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">Torneos</h1>
        <Link href="/admin/tournaments/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Torneo
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : tournaments.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">No hay torneos creados aún</p>
            <Link href="/admin/tournaments/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Crear primer torneo
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tournaments.map(t => (
            <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800">{t.name}</h3>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                      {t.trivia && <span>Trivia: {t.trivia.title}</span>}
                      <span>{t._count.participants} participantes</span>
                      <span>{t._count.matches} partidos</span>
                      <span>Máx. {t.maxPlayers} jugadores</span>
                      <span>Creado {formatDateShort(t.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/admin/tournaments/${t.id}`}>
                      <Button variant="ghost" size="sm" title="Ver torneo" className="text-slate-500 hover:text-blue-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-600"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="¿Eliminar torneo?"
        description="Se eliminarán todos los participantes y partidos asociados. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => { deleteTournament(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
