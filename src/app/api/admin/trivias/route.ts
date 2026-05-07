// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { triviaSchema } from '@/lib/validations/trivia'

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const where = isSuperAdmin(session.user.role) ? {} : { createdBy: session.user.id }

  const trivias = await prisma.trivia.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { name: true } },
      brands: { select: { id: true, name: true }, take: 3 },
      creator: { select: { name: true } },
      _count: { select: { leads: true, gameSessions: true } },
    },
  })

  return NextResponse.json(trivias)
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = triviaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  // Check slug uniqueness
  const existing = await prisma.trivia.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) {
    return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 409 })
  }

  const { brandIds, ...rest } = parsed.data
  const trivia = await prisma.trivia.create({
    data: {
      ...rest,
      createdBy: session.user.id,
      brands: { connect: (brandIds ?? []).map((id: string) => ({ id })) },
    },
  })

  return NextResponse.json(trivia, { status: 201 })
}
