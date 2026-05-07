// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const importSchema = z.object({
  triviaId: z.string().min(1),
  questions: z.array(z.object({
    question: z.string().min(1).max(1000),
    options: z.array(z.string().min(1)).min(2).max(6),
    correctAnswer: z.number().int().min(0),
    points: z.number().int().min(1).max(1000).default(100),
    timeLimit: z.number().int().min(5).max(120).default(30),
  })).min(1).max(200),
})

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const trivia = await prisma.trivia.findUnique({ where: { id: parsed.data.triviaId } })
  if (!trivia) return NextResponse.json({ error: 'Trivia no encontrada' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Validate correctAnswer within options range
  for (const q of parsed.data.questions) {
    if (q.correctAnswer >= q.options.length) {
      return NextResponse.json({
        error: `Respuesta correcta fuera de rango para: "${q.question.slice(0, 50)}"`,
      }, { status: 422 })
    }
  }

  const maxOrder = await prisma.question.aggregate({
    where: { triviaId: parsed.data.triviaId },
    _max: { orderIndex: true },
  })

  const startIndex = (maxOrder._max.orderIndex ?? -1) + 1

  await prisma.question.createMany({
    data: parsed.data.questions.map((q, i) => ({
      triviaId: parsed.data.triviaId,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
      timeLimit: q.timeLimit,
      orderIndex: startIndex + i,
    })),
  })

  return NextResponse.json({ imported: parsed.data.questions.length }, { status: 201 })
}
