// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Trophy, Users, BarChart3, Eye, TrendingUp, Plus, Zap, Target } from 'lucide-react'
import { formatPercent } from '@/lib/utils'

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
        primaryColor: true,
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
      include: { trivia: { select: { title: true, primaryColor: true } } },
    }),
  ])

  const totalStarted = trivias.reduce((s, t) => s + t.gameSessions.length, 0)
  const totalCompleted = trivias.reduce((s, t) => s + t.gameSessions.filter(gs => gs.hasCompleted).length, 0)
  const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0

  const stats = [
    {
      label: 'Total Trivias',
      value: totalTrivias,
      sub: `${activeTrivias} activa${activeTrivias !== 1 ? 's' : ''}`,
      icon: Trophy,
      gradient: 'linear-gradient(135deg, #003087, #0052cc)',
      glow: 'rgba(0,80,204,0.25)',
    },
    {
      label: 'Contactos',
      value: totalLeads,
      sub: 'leads registrados',
      icon: Users,
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      glow: 'rgba(16,185,129,0.25)',
    },
    {
      label: 'Vistas totales',
      value: totalViews,
      sub: 'visitas únicas',
      icon: Eye,
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      glow: 'rgba(168,85,247,0.25)',
    },
    {
      label: 'Completación',
      value: `${completionRate}%`,
      sub: `${totalCompleted} de ${totalStarted}`,
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      glow: 'rgba(245,158,11,0.25)',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Bienvenido, <span className="font-semibold text-slate-700">{session?.user?.name}</span>
          </p>
        </div>
        <Link href="/admin/trivias/new">
          <button
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200"
            style={{ background: 'linear-gradient(135deg, #003087, #0052cc)' }}
          >
            <Plus className="w-4 h-4" />
            Nueva Trivia
          </button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 text-white relative overflow-hidden shadow-lg"
            style={{ background: stat.gradient }}
          >
            {/* Decorative circle */}
            <div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20"
              style={{ backgroundColor: 'white' }}
            />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-white/60 text-xs">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Session metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Iniciadas', value: totalStarted, icon: Zap, color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          { label: 'Completadas', value: totalCompleted, icon: Target, color: '#10b981', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
          { label: 'Abandonadas', value: totalStarted - totalCompleted, icon: TrendingUp, color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        ].map((m, i) => (
          <div key={i} className={`rounded-2xl p-4 border ${m.bg} ${m.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-4 h-4 ${m.text}`} />
              <p className={`text-xs font-semibold uppercase tracking-wider ${m.text}`}>{m.label}</p>
            </div>
            <p className={`text-3xl font-black ${m.text}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trivia performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-700">Rendimiento por Trivia</h2>
          </div>
          <div className="space-y-4">
            {trivias.length === 0 ? (
              <div className="py-8 text-center">
                <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No hay trivias aún.</p>
              </div>
            ) : trivias.map(t => {
              const started = t.gameSessions.length
              const completed = t.gameSessions.filter(gs => gs.hasCompleted).length
              const rate = started > 0 ? Math.round((completed / started) * 100) : 0
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.isActive ? (t.primaryColor || '#003087') : '#94a3b8' }}
                      />
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{t.title}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">
                      {completed}/{started} <span className="text-slate-400">({rate}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${rate}%`, backgroundColor: t.primaryColor || '#003087' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent leads */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-700">Últimos Contactos</h2>
          </div>
          <div className="space-y-1">
            {recentLeads.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Sin contactos registrados aún.</p>
              </div>
            ) : recentLeads.map(lead => {
              const fd = lead.formData as Record<string, string>
              const name = `${fd.nombre ?? fd.name ?? 'N/A'} ${fd.apellido ?? fd.lastName ?? ''}`.trim()
              const pct = lead.maxScore > 0 ? Math.round((lead.score / lead.maxScore) * 100) : 0
              const initial = name[0]?.toUpperCase() ?? '?'
              return (
                <div key={lead.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ backgroundColor: lead.trivia.primaryColor || '#003087' }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{name}</p>
                    <p className="text-xs text-slate-400 truncate">{lead.trivia.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">{lead.score}</p>
                    <p className="text-xs text-slate-400">{pct}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
