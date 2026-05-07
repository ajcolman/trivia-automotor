// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { buildCsv } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const triviaId = searchParams.get('triviaId')

  const triviaFilter = isSuperAdmin(session.user.role)
    ? triviaId ? { id: triviaId } : {}
    : { createdBy: session.user.id, ...(triviaId ? { id: triviaId } : {}) }

  const allowedTrivias = await prisma.trivia.findMany({
    where: triviaFilter,
    select: { id: true },
  })
  const triviaIds = allowedTrivias.map(t => t.id)

  const leads = await prisma.lead.findMany({
    where: { triviaId: { in: triviaIds } },
    orderBy: { completedAt: 'desc' },
    take: 50000,
    include: { trivia: { select: { title: true } } },
  })

  if (leads.length === 0) {
    const csv = buildCsv(['trivia', 'score', 'maxScore', 'completedAt'], [])
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leads.csv"',
      },
    })
  }

  const allKeys = new Set<string>()
  leads.forEach(l => Object.keys(l.formData as object).forEach(k => allKeys.add(k)))
  const formKeys = Array.from(allKeys)

  const headers = ['trivia', 'score', 'maxScore', 'porcentaje', 'completedAt', ...formKeys]

  const rows = leads.map(lead => {
    const fd = lead.formData as Record<string, string>
    const baseRow: unknown[] = [
      lead.trivia.title,
      lead.score,
      lead.maxScore,
      lead.maxScore > 0 ? `${Math.round((lead.score / lead.maxScore) * 100)}%` : '0%',
      lead.completedAt.toISOString(),
    ]
    formKeys.forEach(k => baseRow.push(fd[k] ?? ''))
    return baseRow
  })

  const csv = buildCsv(headers, rows)
  const filename = `leads-${triviaId ?? 'all'}-${Date.now()}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
