// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Trophy, Users, BarChart3, Eye, TrendingUp, CheckCircle2, XCircle, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatPercent } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as { id: string }).id
  const role = (session!.user as { role: string }).role
  const isSuperAdmin = role === 'super_admin'

  const triviaFilter = isSuperAdmin ? {} : { createdBy: userId }

  const [totalTrivias, activeTrivias, trivias] = await Promise.all([
    prisma.trivia.count({ where: triviaFilter }),
    prisma.trivia.count({ where: { ...triviaFilter, isActive: true } }),
    prisma.trivia.findMany({
      where: triviaFilter,
      select: {
        id: true, title: true, isActive: true,
        _count: { select: { leads: true, gameSessions: true, pageViews: true } },
        gameSessions: { select: { hasCompleted: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const triviaIds = trivias.map(t => t.id)
  const [totalLeads, totalViews, recentLeads] = await Promise.all([
    prisma.lead.count({ where: { triviaId: { in: triviaIds } } }),
    prisma.pageView.count({ where: { triviaId: { in: triviaIds } } }),
    prisma.lead.findMany({
      where: { triviaId: { in: triviaIds } },
      orderBy: { completedAt: 'desc' },
      take: 8,
      include: { trivia: { select: { title: true } } },
    }),
  ])

  const totalStarted = trivias.reduce((s, t) => s + t.gameSessions.length, 0)
  const totalCompleted = trivias.reduce((s, t) => s + t.gameSessions.filter(gs => gs.hasCompleted).length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Bienvenido, {session?.user?.name}</p>
        </div>
        <Link href="/admin/trivias/new">
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">
            <Plus className="w-4 h-4" />
            Nueva Trivia
          </button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Trivias', value: totalTrivias, sub: `${activeTrivias} activas`, icon: Trophy, color: 'bg-blue-500' },
          { label: 'Total Contactos', value: totalLeads, sub: 'leads registrados', icon: Users, color: 'bg-green-500' },
          { label: 'Vistas totales', value: totalViews, sub: 'visitas a trivias', icon: Eye, color: 'bg-purple-500' },
          { label: 'Tasa completación', value: `${totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0}%`, sub: `${totalCompleted}/${totalStarted}`, icon: TrendingUp, color: 'bg-orange-500' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-800">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Iniciadas', value: totalStarted, color: 'border-blue-400', icon: '▶' },
          { label: 'Completadas', value: totalCompleted, color: 'border-green-400', icon: '✓' },
          { label: 'Abandonadas', value: totalStarted - totalCompleted, color: 'border-orange-400', icon: '✗' },
        ].map((m, i) => (
          <Card key={i} className={`border-l-4 ${m.color} shadow-sm`}>
            <CardContent className="p-4">
              <p className="text-2xl font-black text-slate-800">{m.value}</p>
              <p className="text-xs text-slate-500">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trivia performance */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Rendimiento por Trivia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trivias.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">No hay trivias aún.</p>
              )}
              {trivias.map(t => {
                const started = t.gameSessions.length
                const completed = t.gameSessions.filter(gs => gs.hasCompleted).length
                const rate = started > 0 ? Math.round((completed / started) * 100) : 0
                return (
                  <div key={t.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{t.title}</span>
                        <Badge variant={t.isActive ? 'default' : 'secondary'} className="text-xs">
                          {t.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">{completed}/{started} ({rate}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent leads */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Últimos Contactos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLeads.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">Aún no hay contactos registrados.</p>
              )}
              {recentLeads.map(lead => {
                const fd = lead.formData as Record<string, string>
                const name = `${fd.nombre ?? fd.name ?? 'N/A'} ${fd.apellido ?? fd.lastName ?? ''}`.trim()
                const pct = lead.maxScore > 0 ? Math.round((lead.score / lead.maxScore) * 100) : 0
                return (
                  <div key={lead.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 text-xs font-bold">
                        {name[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{lead.trivia.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{lead.score}</p>
                      <p className="text-xs text-slate-400">{pct}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
