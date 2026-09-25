// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'

const cambioSchema = z.object({
  number: z.string().trim().max(10).nullable().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  subtitle: z.string().trim().max(120).nullable().optional(),
  teamName: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const actual = await prisma.contender.findUnique({
    where: { id: params.id },
    select: { id: true, eventId: true, number: true },
  })
  if (!actual) return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 })

  const parsed = cambioSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const datos = parsed.data
  const number = datos.number !== undefined ? datos.number?.trim() || null : undefined

  if (number && number !== actual.number) {
    const repetido = await prisma.contender.findUnique({
      where: { eventId_number: { eventId: actual.eventId, number } },
      select: { id: true },
    })
    if (repetido) {
      return NextResponse.json({ error: `Ya hay un participante con el número ${number}.` }, { status: 409 })
    }
  }

  const participante = await prisma.contender.update({
    where: { id: params.id },
    data: {
      ...(number !== undefined ? { number } : {}),
      ...(datos.name !== undefined ? { name: datos.name } : {}),
      ...(datos.subtitle !== undefined ? { subtitle: datos.subtitle?.trim() || null } : {}),
      ...(datos.teamName !== undefined ? { teamName: datos.teamName?.trim() || null } : {}),
      ...(datos.category !== undefined ? { category: datos.category?.trim() || null } : {}),
      ...(datos.imageUrl !== undefined ? { imageUrl: datos.imageUrl?.trim() || null } : {}),
      ...(datos.isFeatured !== undefined ? { isFeatured: datos.isFeatured } : {}),
      ...(datos.isActive !== undefined ? { isActive: datos.isActive } : {}),
    },
    select: { id: true, number: true, name: true, isActive: true, isFeatured: true },
  })

  await logAudit({
    entityType: 'Contender',
    entityId: participante.id,
    entityName: `${participante.number ? `#${participante.number} ` : ''}${participante.name}`,
    action: 'UPDATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, participante })
}

/**
 * Baja de un participante.
 *
 * Si alguien ya lo eligió en alguna predicción no se borra, se desactiva: las
 * predicciones guardan su id dentro de un Json y borrarlo dejaría esas
 * respuestas apuntando a la nada, imposibles de mostrar y de auditar.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const actual = await prisma.contender.findUnique({
    where: { id: params.id },
    select: { id: true, eventId: true, number: true, name: true },
  })
  if (!actual) return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 })

  const elegidoEn = await prisma.prediction.count({
    where: {
      market: { eventId: actual.eventId },
      // `value` guarda el id suelto (elegir uno) o dentro de un arreglo.
      OR: [
        { value: { equals: actual.id } },
        { value: { array_contains: actual.id } },
      ],
    },
  })

  const etiqueta = `${actual.number ? `#${actual.number} ` : ''}${actual.name}`

  if (elegidoEn > 0) {
    await prisma.contender.update({ where: { id: params.id }, data: { isActive: false } })
    await logAudit({
      entityType: 'Contender',
      entityId: actual.id,
      entityName: `${etiqueta} · desactivado (elegido en ${elegidoEn} predicciones)`,
      action: 'UPDATE',
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
    })
    return NextResponse.json({ ok: true, desactivado: true, elegidoEn })
  }

  await prisma.contender.delete({ where: { id: params.id } })
  await logAudit({
    entityType: 'Contender',
    entityId: actual.id,
    entityName: etiqueta,
    action: 'DELETE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, desactivado: false, elegidoEn: 0 })
}
