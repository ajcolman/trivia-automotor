// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session.user.id
  const isSuper = isSuperAdmin(session.user.role)

  const triviaFilter = isSuper ? {} : { createdBy: userId }

  const [totalTrivias, activeTrivias, trivias] = await Promise.all([
    prisma.trivia.count({ where: triviaFilter }),
    prisma.trivia.count({ where: { ...triviaFilter, isActive: true } }),
    prisma.trivia.findMany({
      where: triviaFilter,
      select: {
        id: true,
        title: true,
        _count: { select: { leads: true, gameSessions: true, pageViews: true } },
        gameSessions: { select: { hasCompleted: true } },
      },
    }),
  ])

  const triviaIds = trivias.map(t => t.id)

  const [totalLeads, totalPageViews, recentLeads] = await Promise.all([
    prisma.lead.count({ where: { triviaId: { in: triviaIds } } }),
    prisma.pageView.count({ where: { triviaId: { in: triviaIds } } }),
    prisma.lead.findMany({
      where: { triviaId: { in: triviaIds } },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: { trivia: { select: { title: true } } },
    }),
  ])

  const triviaStats = trivias.map(t => {
    const sessions = t.gameSessions
    const started = sessions.length
    const completed = sessions.filter(s => s.hasCompleted).length
    const abandoned = started - completed
    return {
      id: t.id,
      title: t.title,
      views: t._count.pageViews,
      started,
      completed,
      abandoned,
      leads: t._count.leads,
      completionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
    }
  })

  const totalStarted = triviaStats.reduce((s, t) => s + t.started, 0)
  const totalCompleted = triviaStats.reduce((s, t) => s + t.completed, 0)
  const totalAbandoned = triviaStats.reduce((s, t) => s + t.abandoned, 0)

  return NextResponse.json({
    totalTrivias,
    activeTrivias,
    totalLeads,
    totalPageViews,
    totalStarted,
    totalCompleted,
    totalAbandoned,
    completionRate: totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0,
    recentLeads,
    triviaStats,
  })
}
