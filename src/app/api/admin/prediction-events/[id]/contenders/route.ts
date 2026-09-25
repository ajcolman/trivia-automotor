// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'

const participanteSchema = z.object({
  /** Número de auto, dorsal, etc. Es la clave con la que se reimporta. */
  number: z.string().trim().max(10).optional().nullable(),
  name: z.string().trim().min(1, 'Falta el nombre').max(120),
  subtitle: z.string().trim().max(120).optional().nullable(),
  teamName: z.string().trim().max(120).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  /** Se muestra primero y resaltado. Sirve para las marcas que vendemos. */
  isFeatured: z.boolean().optional().default(false),
})

/** Uno solo, o una tanda entera cuando viene de importar una planilla. */
const cuerpoSchema = z.union([
  participanteSchema,
  z.object({ participantes: z.array(participanteSchema).min(1).max(500) }),
])

/**
 * Alta de participantes. Con `number` cargado se puede reimportar la planilla
 * las veces que haga falta: el que ya existe se actualiza en vez de duplicarse,
 * que es como se maneja un entry list que cambia hasta último momento.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const evento = await prisma.predictionEvent.findUnique({
    where: { id: params.id },
    select: { id: true, title: true },
  })
  if (!evento) return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })

  const parsed = cuerpoSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const filas = 'participantes' in parsed.data ? parsed.data.participantes : [parsed.data]

  // Un mismo número dos veces en la planilla haría fallar la tanda a mitad de
  // camino, dejándola cargada por la mitad. Se corta antes de tocar la base.
  const numeros = filas.map(f => f.number?.trim()).filter((n): n is string => !!n)
  const duplicado = numeros.find((n, i) => numeros.indexOf(n) !== i)
  if (duplicado) {
    return NextResponse.json(
      { error: `El número ${duplicado} aparece dos veces en la lista.` },
      { status: 400 },
    )
  }

  const ultimo = await prisma.contender.findFirst({
    where: { eventId: evento.id },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  })
  let orderIndex = (ultimo?.orderIndex ?? -1) + 1

  let creados = 0
  let actualizados = 0

  for (const fila of filas) {
    const number = fila.number?.trim() || null
    const datos = {
      name: fila.name,
      subtitle: fila.subtitle?.trim() || null,
      teamName: fila.teamName?.trim() || null,
      category: fila.category?.trim() || null,
      imageUrl: fila.imageUrl?.trim() || null,
      isFeatured: fila.isFeatured ?? false,
    }

    // Sin número no hay con qué identificarlo entre importaciones: se crea.
    const existente = number
      ? await prisma.contender.findUnique({
          where: { eventId_number: { eventId: evento.id, number } },
          select: { id: true },
        })
      : null

    if (existente) {
      // Vuelve a activarse: reimportar la planilla es la forma de recuperar a
      // alguien que se había dado de baja.
      await prisma.contender.update({
        where: { id: existente.id },
        data: { ...datos, isActive: true },
      })
      actualizados++
    } else {
      await prisma.contender.create({
        data: { eventId: evento.id, number, ...datos, orderIndex: orderIndex++ },
      })
      creados++
    }
  }

  await logAudit({
    entityType: 'Contender',
    entityId: evento.id,
    entityName: `${evento.title} · ${creados} participantes nuevos, ${actualizados} actualizados`,
    action: 'CREATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, creados, actualizados }, { status: 201 })
}
