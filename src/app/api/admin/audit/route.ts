// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(true) // super_admin only
  if (error) return error

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType') ?? undefined
  const action = searchParams.get('action') ?? undefined
  const userId = searchParams.get('userId') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 50

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(action ? { action: action as 'CREATE' | 'UPDATE' | 'DELETE' } : {}),
    ...(userId ? { userId } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, pageSize })
}
