// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'

/**
 * Reinicia un evento de predicción.
 *
 * `alcance: 'resultados'` borra los resultados cargados y deja las
 * predicciones sin puntuar, pero conserva lo que eligió cada jugador. Sirve
 * para rehacer una carga mal hecha.
 *
 * `alcance: 'todo'` borra además las predicciones. Deja el juego como recién
 * publicado. Es para limpiar después de probar, antes de abrirlo al público.
 *
 * Los jugadores y sus cuentas no se tocan en ningún caso.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const evento = await prisma.predictionEvent.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, status: true },
  })
  if (!evento) {
    return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const alcance = body?.alcance
  if (alcance !== 'resultados' && alcance !== 'todo') {
    return NextResponse.json({ error: 'Alcance no válido.' }, { status: 400 })
  }

  // Con el juego abierto, borrar predicciones le saca al jugador lo que cargó
  // sin que se entere. Que haya que cerrarlo primero es deliberado.
  if (alcance === 'todo' && (evento.status === 'open' || evento.status === 'live')) {
    return NextResponse.json(
      {
        error:
          'Para borrar las predicciones el juego no puede estar abierto. Pasalo a Borrador o Cerrado primero.',
      },
      { status: 409 },
    )
  }

  const dondeMercados = { market: { eventId: evento.id } }

  const [resultados] = await prisma.$transaction([
    prisma.resolution.deleteMany({ where: dondeMercados }),
    prisma.prediction.updateMany({
      where: dondeMercados,
      data: { pointsAwarded: null, scoredAt: null },
    }),
  ])

  let predicciones = 0
  if (alcance === 'todo') {
    const { count } = await prisma.prediction.deleteMany({ where: dondeMercados })
    predicciones = count
  }

  await logAudit({
    entityType: 'PredictionEvent',
    entityId: evento.id,
    entityName:
      alcance === 'todo'
        ? `${evento.title} · reinicio total: ${resultados.count} resultados y ${predicciones} predicciones`
        : `${evento.title} · reinicio de resultados: ${resultados.count}`,
    action: 'DELETE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({
    ok: true,
    resultados: resultados.count,
    predicciones,
  })
}
