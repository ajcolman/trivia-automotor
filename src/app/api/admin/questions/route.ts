// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { questionSchema } from '@/lib/validations/trivia'

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = questionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  // Ownership check
  const trivia = await prisma.trivia.findUnique({ where: { id: parsed.data.triviaId } })
  if (!trivia) return NextResponse.json({ error: 'Trivia no encontrada' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Get max orderIndex
  const maxOrder = await prisma.question.aggregate({
    where: { triviaId: parsed.data.triviaId },
    _max: { orderIndex: true },
  })

  const { triviaId, options, ...rest } = parsed.data
  const question = await prisma.question.create({
    data: {
      ...rest,
      triviaId: triviaId!,
      options: options as string[],
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  })

  return NextResponse.json(question, { status: 201 })
}
