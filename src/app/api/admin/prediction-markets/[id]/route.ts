// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { MarketType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { revalidateLanding } from '@/lib/revalidate'
import { configSchema, normalizarConfig } from '@/lib/predictions/market-config'

/**
 * ABM de la *pregunta* en sí. El resultado que se le carga vive aparte, en
 * `[id]/resolution`: son dos cosas distintas y borrar una no debe borrar la
 * otra por accidente.
 */

const cambioSchema = z.object({
  title: z.string().trim().min(1, 'La pregunta necesita un título').max(200).optional(),
  type: z.nativeEnum(MarketType).optional(),
  /** ISO. Si no viene y el mercado cuelga de un tramo, manda el del tramo. */
  locksAt: z.string().datetime({ offset: true }).optional(),
  orderIndex: z.number().int().min(0).max(9999).optional(),
  config: configSchema.optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const actual = await prisma.market.findUnique({
    where: { id: params.id },
    select: { id: true, type: true, title: true, config: true, _count: { select: { predictions: true } } },
  })
  if (!actual) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })

  const parsed = cambioSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const { title, type, locksAt, orderIndex, config } = parsed.data

  // Cambiar el tipo cambia la forma de las respuestas guardadas: lo que ya
  // predijo la gente dejaría de ser válido y valdría cero sin aviso.
  if (type && type !== actual.type && actual._count.predictions > 0) {
    return NextResponse.json(
      { error: `No se puede cambiar el tipo: ya hay ${actual._count.predictions} predicciones cargadas.` },
      { status: 409 },
    )
  }

  const tipoFinal = type ?? actual.type
  const mercado = await prisma.market.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(locksAt !== undefined ? { locksAt: new Date(locksAt) } : {}),
      ...(orderIndex !== undefined ? { orderIndex } : {}),
      ...(config !== undefined
        ? { config: normalizarConfig(tipoFinal, config) as object }
        : {}),
    },
    select: { id: true, title: true, type: true, locksAt: true, orderIndex: true, config: true },
  })

  await logAudit({
    entityType: 'Market',
    entityId: mercado.id,
    entityName: mercado.title,
    action: 'UPDATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  revalidateLanding()
  return NextResponse.json({ ok: true, mercado })
}

/** Borra la pregunta con todo lo que cuelga de ella: predicciones y resultado. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const actual = await prisma.market.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, _count: { select: { predictions: true } } },
  })
  if (!actual) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })

  await prisma.market.delete({ where: { id: params.id } })

  await logAudit({
    entityType: 'Market',
    entityId: actual.id,
    entityName: `${actual.title} · ${actual._count.predictions} predicciones borradas`,
    action: 'DELETE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  revalidateLanding()
  return NextResponse.json({ ok: true, prediccionesBorradas: actual._count.predictions })
}
