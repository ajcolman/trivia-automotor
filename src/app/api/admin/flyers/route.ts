// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const flyerSchema = z.object({
  triviaId: z.string().min(1),
  imageUrl: z.string().url(),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = flyerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const trivia = await prisma.trivia.findUnique({ where: { id: parsed.data.triviaId } })
  if (!trivia) return NextResponse.json({ error: 'Trivia no encontrada' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const flyer = await prisma.triviaFlyer.create({ data: parsed.data })
  return NextResponse.json(flyer, { status: 201 })
}
