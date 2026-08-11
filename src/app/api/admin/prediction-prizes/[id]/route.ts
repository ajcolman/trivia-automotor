// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'

const cambioSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  position: z.number().int().min(1).max(99).optional(),
})

/**
 * Edita un premio de un evento de predicción.
 *
 * Se restringe a premios de eventos: los de trivias tienen su propia ruta y no
 * queremos que esta sirva para tocarlos de rebote.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const actual = await prisma.prize.findUnique({
    where: { id: params.id },
    select: { id: true, predictionEventId: true },
  })
  if (!actual?.predictionEventId) {
    return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  }

  const parsed = cambioSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const premio = await prisma.prize.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
    },
  })

  await logAudit({
    entityType: 'Prize',
    entityId: premio.id,
    entityName: premio.name,
    action: 'UPDATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, premio })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const actual = await prisma.prize.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, predictionEventId: true },
  })
  if (!actual?.predictionEventId) {
    return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  }

  await prisma.prize.delete({ where: { id: params.id } })

  await logAudit({
    entityType: 'Prize',
    entityId: actual.id,
    entityName: actual.name,
    action: 'DELETE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true })
}
