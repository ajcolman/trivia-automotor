// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { formFieldSchema } from '@/lib/validations/trivia'

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = formFieldSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const trivia = await prisma.trivia.findUnique({ where: { id: parsed.data.triviaId } })
  if (!trivia) return NextResponse.json({ error: 'Trivia no encontrada' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const maxOrder = await prisma.formField.aggregate({
    where: { triviaId: parsed.data.triviaId },
    _max: { orderIndex: true },
  })

  const { triviaId, options, ...rest } = parsed.data
  const field = await prisma.formField.create({
    data: {
      ...rest,
      triviaId: triviaId!,
      options: options ?? [],
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  })

  return NextResponse.json(field, { status: 201 })
}
