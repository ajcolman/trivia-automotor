// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { formFieldSchema } from '@/lib/validations/trivia'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const field = await prisma.formField.findUnique({
    where: { id: params.id },
    include: { trivia: { select: { createdBy: true } } },
  })
  if (!field) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && field.trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = formFieldSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })
  }

  const { triviaId: _, options, ...rest } = parsed.data
  const updated = await prisma.formField.update({
    where: { id: params.id },
    data: { ...rest, ...(options !== undefined ? { options: options ?? [] } : {}) },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const field = await prisma.formField.findUnique({
    where: { id: params.id },
    include: { trivia: { select: { createdBy: true } } },
  })
  if (!field) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && field.trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  await prisma.formField.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
