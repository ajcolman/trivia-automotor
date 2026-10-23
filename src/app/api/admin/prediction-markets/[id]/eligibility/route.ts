// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { idsElegidos } from '@/lib/predictions/elegibilidad'

/**
 * Quién larga una pregunta.
 *
 * `contenderIds: null` deja la pregunta abierta a todos los del juego, que no
 * es lo mismo que marcar a todos uno por uno: una tripulación que se sume
 * después entra sola en la pregunta abierta, y no en la que los enumera.
 */

const cambioSchema = z.object({
  // Una lista vacía no se acepta: borraría todas las filas y la convención de
  // "sin filas = todos" dejaría la pregunta abierta a todo el mundo, que es
  // exactamente lo contrario de lo que pidió quien la mandó vacía. Para abrir
  // una pregunta hay que decirlo con null.
  contenderIds: z.array(z.string().cuid()).min(1, 'La lista no puede estar vacía').max(5000).nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const market = await prisma.market.findUnique({
    where: { id: params.id },
    select: {
      id: true, title: true, eventId: true,
      segment: { select: { code: true } },
    },
  })
  if (!market) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })

  const parsed = cambioSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const { contenderIds } = parsed.data
  const unicos = contenderIds === null ? null : Array.from(new Set(contenderIds))

  if (unicos !== null) {
    const propios = await prisma.contender.count({
      where: { id: { in: unicos }, eventId: market.eventId },
    })
    if (propios !== unicos.length) {
      return NextResponse.json(
        { error: 'Alguna tripulación de la lista no pertenece a este juego.' },
        { status: 400 },
      )
    }
  }

  if (unicos === null) {
    await prisma.marketContender.deleteMany({ where: { marketId: market.id } })
  } else {
    await prisma.$transaction([
      prisma.marketContender.deleteMany({ where: { marketId: market.id } }),
      prisma.marketContender.createMany({
        data: unicos.map(contenderId => ({ marketId: market.id, contenderId })),
      }),
    ])
  }

  // Quien ya eligió a alguien que ahora no larga no pierde su predicción: se
  // informa y queda a criterio de quien administra. Borrarla sería decidir por
  // el jugador, y de todos modos no puede ganar, así que no altera el puntaje.
  let prediccionesFuera = 0
  if (unicos !== null) {
    const permitidos = new Set(unicos)
    const predicciones = await prisma.prediction.findMany({
      where: { marketId: market.id },
      select: { value: true },
    })
    prediccionesFuera = predicciones.filter(p => {
      const ids = idsElegidos(p.value)
      return ids.length > 0 && ids.some(id => !permitidos.has(id))
    }).length
  }

  const etiqueta = market.segment ? `${market.segment.code} · ${market.title}` : market.title
  await logAudit({
    entityType: 'Market',
    entityId: market.id,
    entityName: unicos === null
      ? `Elegibilidad abierta a todos · ${etiqueta}`
      : `Elegibilidad: ${unicos.length} tripulaciones · ${etiqueta}`,
    action: 'UPDATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({
    ok: true,
    declarados: unicos?.length ?? null,
    prediccionesFuera,
  })
}
