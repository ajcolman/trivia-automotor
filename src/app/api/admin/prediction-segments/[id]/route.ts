// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { clearResolution } from '@/lib/predictions/resolver'
import { logAudit } from '@/lib/audit'

const cambioSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  /** ISO. Hora de largada del primer auto. */
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  /** ISO. Momento de cierre. Si no viene, sigue a startsAt. */
  locksAt: z.string().datetime({ offset: true }).optional(),
  distanceKm: z.number().min(0).max(1000).nullable().optional(),
  isCancelled: z.boolean().optional(),
})

/**
 * Edita un tramo: nombre, horario, distancia o cancelación.
 *
 * En rally se reprograman y cancelan tramos con frecuencia, así que esto tiene
 * que poder hacerse durante el fin de semana de carrera sin tocar código.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const segmento = await prisma.segment.findUnique({
    where: { id: params.id },
    select: {
      id: true, code: true, name: true, isCancelled: true,
      markets: { select: { id: true } },
    },
  })
  if (!segmento) {
    return NextResponse.json({ error: 'Tramo no encontrado' }, { status: 404 })
  }

  const parsed = cambioSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const { name, startsAt, locksAt, distanceKm, isCancelled } = parsed.data

  // El cierre sigue a la largada salvo que se indique otro a propósito.
  const nuevoCierre = locksAt
    ? new Date(locksAt)
    : startsAt
      ? new Date(startsAt)
      : undefined

  const actualizado = await prisma.segment.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
      ...(nuevoCierre ? { locksAt: nuevoCierre } : {}),
      ...(distanceKm !== undefined ? { distanceKm } : {}),
      ...(isCancelled !== undefined ? { isCancelled } : {}),
    },
    select: { id: true, code: true, name: true, locksAt: true, isCancelled: true },
  })

  // El cierre del tramo manda sobre el de sus preguntas: si se corre el
  // horario, las predicciones tienen que seguir abiertas hasta el nuevo.
  if (nuevoCierre) {
    await prisma.market.updateMany({
      where: { segmentId: params.id },
      data: { locksAt: nuevoCierre },
    })
  }

  // Cancelar un tramo anula su resultado: nadie puede ganar puntos por una
  // etapa que no se corrió.
  let despuntuadas = 0
  if (isCancelled === true && !segmento.isCancelled) {
    for (const m of segmento.markets) {
      despuntuadas += await clearResolution(m.id)
    }
  }

  await logAudit({
    entityType: 'Segment',
    entityId: actualizado.id,
    entityName: `${actualizado.code} · ${actualizado.name}${actualizado.isCancelled ? ' (cancelado)' : ''}`,
    action: 'UPDATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, segmento: actualizado, despuntuadas })
}
