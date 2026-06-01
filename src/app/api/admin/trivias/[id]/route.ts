// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { triviaBaseSchema } from '@/lib/validations/trivia'
import { logAudit } from '@/lib/audit'

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
      brands: { select: { id: true, name: true, logoUrl: true } },
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
  const parsed = triviaBaseSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  if (parsed.data.slug && parsed.data.slug !== ownership.slug) {
    const existing = await prisma.trivia.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 409 })
  }

  const { brandIds, ...rest } = parsed.data
  const updated = await prisma.trivia.update({
    where: { id: params.id },
    data: {
      ...rest,
      brands: { set: (brandIds ?? []).map((id: string) => ({ id })) },
    } as any,
  })

  await logAudit({
    entityType: 'Trivia', entityId: updated.id, entityName: updated.title,
    action: 'UPDATE', userId: session.user.id, userName: session.user.name ?? '', userEmail: session.user.email ?? '',
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const ownership = await checkOwnership(params.id, session.user.id, session.user.role)
  if (ownership === null) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (ownership === false) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  await logAudit({
    entityType: 'Trivia', entityId: params.id, entityName: ownership.title,
    action: 'DELETE', userId: session.user.id, userName: session.user.name ?? '', userEmail: session.user.email ?? '',
  })

  await prisma.trivia.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
