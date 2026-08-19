// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { revalidateLanding } from '@/lib/revalidate'

const premioSchema = z.object({
  name: z.string().trim().min(1, 'Poné un nombre al premio').max(160),
  description: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  position: z.number().int().min(1).max(99),
})

/** Crea un premio para el evento. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const evento = await prisma.predictionEvent.findUnique({
    where: { id: params.id },
    select: { id: true, title: true },
  })
  if (!evento) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

  const parsed = premioSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const premio = await prisma.prize.create({
    data: {
      predictionEventId: evento.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      position: parsed.data.position,
    },
  })

  await logAudit({
    entityType: 'Prize',
    entityId: premio.id,
    entityName: `${premio.name} · ${evento.title}`,
    action: 'CREATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  revalidateLanding()
  return NextResponse.json({ ok: true, premio }, { status: 201 })
}
