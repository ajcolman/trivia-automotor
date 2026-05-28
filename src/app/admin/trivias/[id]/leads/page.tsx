// Author: Angel Colman
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft, Download, FileSpreadsheet, Users, TrendingUp, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface PageProps { params: { id: string } }

export default async function TriviaLeadsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as { id: string }).id
  const role = (session!.user as { role: string }).role

  const trivia = await prisma.trivia.findUnique({
    where: { id: params.id },
    include: {
      leads: { orderBy: { completedAt: 'desc' }, take: 100 },
      gameSessions: { select: { hasCompleted: true } },
    },
  })

  if (!trivia) notFound()
  if (role !== 'super_admin' && trivia.createdBy !== userId) notFound()

  const started = trivia.gameSessions.length
  const completed = trivia.gameSessions.filter(s => s.hasCompleted).length
  const avgScore = trivia.leads.length > 0
    ? Math.round(trivia.leads.reduce((s, l) => s + l.score, 0) / trivia.leads.length)
    : 0
  const avgPct = trivia.leads.length > 0
    ? Math.round(trivia.leads.reduce((s, l) => s + (l.maxScore > 0 ? (l.score / l.maxScore) * 100 : 0), 0) / trivia.leads.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href={`/admin/trivias/${params.id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Volver</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-800">Contactos — {trivia.title}</h1>
        </div>
        <a href={`/api/admin/trivias/${params.id}/export`} className="w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
          </Button>
        </a>
        <a href={`/api/admin/trivias/${params.id}/report`} target="_blank" className="w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" /> Informe PDF
          </Button>
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total contactos', value: trivia.leads.length, icon: Users },
          { label: 'Iniciaron', value: started, icon: TrendingUp },
          { label: 'Completaron', value: completed, icon: Award },
          { label: 'Puntaje promedio', value: `${avgPct}%`, icon: TrendingUp },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <s.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leads table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Puntaje</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">%</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {trivia.leads.map(lead => {
                const fd = lead.formData as Record<string, string>
                const name = `${fd.nombre ?? fd.name ?? ''} ${fd.apellido ?? fd.lastName ?? ''}`.trim() || 'N/A'
                const pct = lead.maxScore > 0 ? Math.round((lead.score / lead.maxScore) * 100) : 0
                return (
                  <tr key={lead.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <div>{fd.correo ?? fd.email ?? ''}</div>
                      <div>{fd.telefono ?? fd.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-blue-600">{lead.score}</span>
                      <span className="text-slate-400">/{lead.maxScore}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={pct >= 70 ? 'bg-green-100 text-green-700 border-0' : pct >= 40 ? 'bg-yellow-100 text-yellow-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                        {pct}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(lead.completedAt)}</td>
                  </tr>
                )
              })}
              {trivia.leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">No hay contactos registrados aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
