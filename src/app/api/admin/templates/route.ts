// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const templateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#003087'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#002060'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FFD700'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#F8FAFC'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1A1A2E'),
  questions: z.array(z.unknown()).default([]),
  formFields: z.array(z.unknown()).default([]),
  isPublic: z.boolean().default(false),
  fromTriviaId: z.string().optional(),
})

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const [owned, shared] = await Promise.all([
    prisma.triviaTemplate.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.templateShare.findMany({
      where: { sharedWithId: session.user.id },
      include: { template: { include: { owner: { select: { name: true } } } } },
    }),
  ])

  return NextResponse.json({
    owned,
    shared: shared.map(s => s.template),
  })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = templateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  let questions = parsed.data.questions
  let formFields = parsed.data.formFields

  // If cloning from existing trivia
  if (parsed.data.fromTriviaId) {
    const trivia = await prisma.trivia.findUnique({
      where: { id: parsed.data.fromTriviaId },
      include: { questions: { orderBy: { orderIndex: 'asc' } }, formFields: { orderBy: { orderIndex: 'asc' } } },
    })
    if (trivia) {
      questions = trivia.questions as unknown[]
      formFields = trivia.formFields as unknown[]
    }
  }

  const { fromTriviaId: _, ...data } = parsed.data
  const template = await prisma.triviaTemplate.create({
    data: {
      ...data,
      questions: questions as Parameters<typeof prisma.triviaTemplate.create>[0]['data']['questions'],
      formFields: formFields as Parameters<typeof prisma.triviaTemplate.create>[0]['data']['formFields'],
      ownerId: session.user.id,
    },
  })

  return NextResponse.json(template, { status: 201 })
}
