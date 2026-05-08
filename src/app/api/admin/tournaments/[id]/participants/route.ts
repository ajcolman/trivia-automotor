// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const deleteParticipantSchema = z.object({
  participantId: z.string().min(1),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAuth()
  if (error) return error

  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } })
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: params.id },
    orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
    include: {
      vehicle: {
        select: {
          id: true,
          spriteUrl: true,
          modelName: true,
          isGeneric: true,
          genericType: true,
        },
      },
    },
  })

  return NextResponse.json(participants)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAuth()
  if (error) return error

  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } })
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  if (tournament.status !== 'pending') {
    return NextResponse.json(
      { error: 'Solo se pueden eliminar participantes de torneos en estado pendiente' },
      { status: 409 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = deleteParticipantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const participant = await prisma.tournamentParticipant.findFirst({
    where: { id: parsed.data.participantId, tournamentId: params.id },
  })
  if (!participant) {
    return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 })
  }

  await prisma.tournamentParticipant.delete({ where: { id: parsed.data.participantId } })

  return NextResponse.json({ success: true })
}
