// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'

/**
 * Elimina la cuenta de un jugador y todo lo que cuelga de ella.
 *
 * La política de privacidad compromete a borrar los datos de quien pide la
 * baja, así que esto existe para poder cumplirlo. Es irreversible: se pierden
 * sus predicciones y, con ellas, su posición en los rankings.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const player = await prisma.player.findUnique({
    where: { id: params.id },
    select: {
      id: true, email: true, fullName: true,
      _count: { select: { predictions: true } },
    },
  })
  if (!player) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }

  // Predicciones y tokens caen por cascada, pero los borramos explícitamente
  // para que quede en una transacción y no dependa de la configuración del
  // esquema si alguien la cambia.
  await prisma.$transaction([
    prisma.prediction.deleteMany({ where: { playerId: player.id } }),
    prisma.playerToken.deleteMany({ where: { playerId: player.id } }),
    prisma.player.delete({ where: { id: player.id } }),
  ])

  await logAudit({
    entityType: 'Player',
    entityId: player.id,
    entityName: `${player.fullName} · ${player.email} · ${player._count.predictions} predicciones`,
    action: 'DELETE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, borradas: player._count.predictions })
}
