// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.orderedIds)) {
    return NextResponse.json({ error: 'orderedIds array requerido' }, { status: 400 })
  }

  const { orderedIds } = body as { orderedIds: string[] }

  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.question.update({ where: { id }, data: { orderIndex: index } }),
    ),
  )

  return NextResponse.json({ ok: true })
}
