// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const flyer = await prisma.triviaFlyer.findUnique({
    where: { id: params.id },
    include: { trivia: { select: { createdBy: true } } },
  })
  if (!flyer) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && flyer.trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const updated = await prisma.triviaFlyer.update({
    where: { id: params.id },
    data: { isActive: typeof body.isActive === 'boolean' ? body.isActive : !flyer.isActive },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const flyer = await prisma.triviaFlyer.findUnique({
    where: { id: params.id },
    include: { trivia: { select: { createdBy: true } } },
  })
  if (!flyer) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && flyer.trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  await prisma.triviaFlyer.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
