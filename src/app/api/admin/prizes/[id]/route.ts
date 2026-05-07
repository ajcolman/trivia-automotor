// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  position: z.number().int().min(1).max(10).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const prize = await prisma.prize.findUnique({
    where: { id: params.id },
    include: { trivia: { select: { createdBy: true } } },
  })
  if (!prize) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && prize.trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  const updated = await prisma.prize.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const prize = await prisma.prize.findUnique({
    where: { id: params.id },
    include: { trivia: { select: { createdBy: true } } },
  })
  if (!prize) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && prize.trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  await prisma.prize.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
