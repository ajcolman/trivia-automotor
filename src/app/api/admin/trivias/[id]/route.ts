// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { triviaSchema } from '@/lib/validations/trivia'

async function checkOwnership(id: string, userId: string, role: string) {
  const trivia = await prisma.trivia.findUnique({ where: { id } })
  if (!trivia) return null
  if (!isSuperAdmin(role) && trivia.createdBy !== userId) return false
  return trivia
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const trivia = await prisma.trivia.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
      formFields: { orderBy: { orderIndex: 'asc' } },
      prizes: { orderBy: { position: 'asc' } },
      flyers: true,
      company: true,
      brand: true,
      _count: { select: { leads: true, gameSessions: true } },
    },
  })

  if (!trivia) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  return NextResponse.json(trivia)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const ownership = await checkOwnership(params.id, session.user.id, session.user.role)
  if (ownership === null) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (ownership === false) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = triviaSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  if (parsed.data.slug && parsed.data.slug !== ownership.slug) {
    const existing = await prisma.trivia.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 409 })
  }

  const updated = await prisma.trivia.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const ownership = await checkOwnership(params.id, session.user.id, session.user.role)
  if (ownership === null) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (ownership === false) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  await prisma.trivia.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
