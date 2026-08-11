// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { EventStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'

const ESTADOS = Object.values(EventStatus) as string[]

/** Cambia el estado del evento (borrador, abierto, en vivo, cerrado, liquidado). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const status = body?.status

  if (typeof status !== 'string' || !ESTADOS.includes(status)) {
    return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 })
  }

  const evento = await prisma.predictionEvent.update({
    where: { id: params.id },
    data: { status: status as EventStatus },
    select: { id: true, title: true, status: true },
  })

  await logAudit({
    entityType: 'PredictionEvent',
    entityId: evento.id,
    entityName: `${evento.title} → ${evento.status}`,
    action: 'UPDATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, evento })
}
