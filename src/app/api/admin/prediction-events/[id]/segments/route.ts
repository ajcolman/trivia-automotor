// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { CONFIG_POR_DEFECTO } from '@/lib/predictions/market-config'

const tramoSchema = z.object({
  code: z.string().trim().min(1, 'Poné un código al tramo').max(20),
  name: z.string().trim().min(1, 'Poné un nombre al tramo').max(160),
  distanceKm: z.number().min(0).max(1000).optional().nullable(),
  /** ISO. Hora de largada del primer auto. */
  startsAt: z.string().datetime({ offset: true }),
  /** ISO. Si no viene, cierra cuando larga. */
  locksAt: z.string().datetime({ offset: true }).optional(),
  /**
   * Crear también la pregunta "ganador del tramo". Es lo que se quiere casi
   * siempre: un tramo sin pregunta no se juega.
   */
  conPregunta: z.boolean().optional().default(true),
})

/** Agrega un tramo al evento y, salvo que se pida lo contrario, su pregunta. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const evento = await prisma.predictionEvent.findUnique({
    where: { id: params.id },
    select: { id: true, title: true },
  })
  if (!evento) return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })

  const parsed = tramoSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const { code, name, distanceKm, startsAt, locksAt, conPregunta } = parsed.data

  const repetido = await prisma.segment.findUnique({
    where: { eventId_code: { eventId: evento.id, code } },
    select: { id: true },
  })
  if (repetido) {
    return NextResponse.json({ error: `Ya hay un tramo con el código "${code}".` }, { status: 409 })
  }

  // Se agrega al final. El orden se reacomoda por horario en la pantalla.
  const ultimo = await prisma.segment.findFirst({
    where: { eventId: evento.id },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  })
  const orderIndex = (ultimo?.orderIndex ?? -1) + 1
  const cierre = new Date(locksAt ?? startsAt)

  const tramo = await prisma.segment.create({
    data: {
      eventId: evento.id,
      code,
      name,
      distanceKm: distanceKm ?? null,
      startsAt: new Date(startsAt),
      locksAt: cierre,
      orderIndex,
    },
    select: { id: true, code: true, name: true },
  })

  if (conPregunta) {
    await prisma.market.create({
      data: {
        eventId: evento.id,
        segmentId: tramo.id,
        type: 'single_pick',
        title: `Ganador del ${tramo.code} · ${tramo.name}`,
        locksAt: cierre,
        config: CONFIG_POR_DEFECTO.single_pick as object,
        orderIndex,
      },
    })
  }

  await logAudit({
    entityType: 'Segment',
    entityId: tramo.id,
    entityName: `${tramo.code} · ${tramo.name} · ${evento.title}`,
    action: 'CREATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, tramo, conPregunta }, { status: 201 })
}
