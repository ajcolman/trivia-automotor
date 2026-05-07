// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const triviaId = searchParams.get('triviaId')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))

  const triviaFilter = isSuperAdmin(session.user.role)
    ? triviaId ? { id: triviaId } : {}
    : { createdBy: session.user.id, ...(triviaId ? { id: triviaId } : {}) }

  const allowedTrivias = await prisma.trivia.findMany({
    where: triviaFilter,
    select: { id: true },
  })

  const triviaIds = allowedTrivias.map(t => t.id)

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { triviaId: { in: triviaIds } },
      orderBy: { completedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { trivia: { select: { title: true } } },
    }),
    prisma.lead.count({ where: { triviaId: { in: triviaIds } } }),
  ])

  return NextResponse.json({ leads, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}
