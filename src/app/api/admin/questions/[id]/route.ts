// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { questionSchema } from '@/lib/validations/trivia'

async function checkOwnership(questionId: string, userId: string, role: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { trivia: { select: { createdBy: true } } },
  })
  if (!question) return null
  if (!isSuperAdmin(role) && question.trivia.createdBy !== userId) return false
  return question
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const q = await checkOwnership(params.id, session.user.id, session.user.role)
  if (q === null) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (q === false) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = questionSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const updated = await prisma.question.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const q = await checkOwnership(params.id, session.user.id, session.user.role)
  if (q === null) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (q === false) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  await prisma.question.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
