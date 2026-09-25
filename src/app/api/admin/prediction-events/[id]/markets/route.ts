// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { MarketType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { configSchema, normalizarConfig, CONFIG_POR_DEFECTO } from '@/lib/predictions/market-config'

const preguntaSchema = z.object({
  title: z.string().trim().min(1, 'La pregunta necesita un título').max(200),
  type: z.nativeEnum(MarketType),
  /** Nulo = pregunta de todo el evento, como el podio final. */
  segmentId: z.string().trim().min(1).optional().nullable(),
  /** ISO. Si cuelga de un tramo y no viene, hereda el cierre del tramo. */
  locksAt: z.string().datetime({ offset: true }).optional(),
  config: configSchema.optional(),
})

/** Agrega una pregunta al juego. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const evento = await prisma.predictionEvent.findUnique({
    where: { id: params.id },
    select: { id: true, title: true },
  })
  if (!evento) return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })

  const parsed = preguntaSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const { title, type, segmentId, locksAt, config } = parsed.data

  let cierre = locksAt ? new Date(locksAt) : null
  if (segmentId) {
    const tramo = await prisma.segment.findFirst({
      where: { id: segmentId, eventId: evento.id },
      select: { locksAt: true },
    })
    if (!tramo) {
      return NextResponse.json({ error: 'El tramo elegido no es de este juego.' }, { status: 400 })
    }
    cierre ??= tramo.locksAt
  }
  if (!cierre) {
    return NextResponse.json(
      { error: 'Decí cuándo cierra la pregunta, o colgala de un tramo para que herede su horario.' },
      { status: 400 },
    )
  }

  const ultimo = await prisma.market.findFirst({
    where: { eventId: evento.id },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  })

  const pregunta = await prisma.market.create({
    data: {
      eventId: evento.id,
      segmentId: segmentId || null,
      type,
      title,
      locksAt: cierre,
      orderIndex: (ultimo?.orderIndex ?? -1) + 1,
      config: normalizarConfig(type, config ?? CONFIG_POR_DEFECTO[type]) as object,
    },
    select: { id: true, title: true, type: true, locksAt: true, config: true },
  })

  await logAudit({
    entityType: 'Market',
    entityId: pregunta.id,
    entityName: `${pregunta.title} · ${evento.title}`,
    action: 'CREATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, pregunta }, { status: 201 })
}
