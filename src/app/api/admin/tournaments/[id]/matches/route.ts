// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const updateMatchSchema = z.object({
  matchId: z.string().min(1),
  scheduledAt: z.string().datetime().optional().nullable(),
  enableRoom: z.boolean().optional(),
  scoreP1: z.number().int().min(0).optional(),
  scoreP2: z.number().int().min(0).optional(),
  status: z.enum(['waiting', 'playing', 'finished']).optional(),
  winnerId: z.string().optional().nullable(),
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

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId: params.id },
    orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
    include: {
      player1: { select: { id: true, playerName: true, cedula: true } },
      player2: { select: { id: true, playerName: true, cedula: true } },
    },
  })

  return NextResponse.json(matches)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAuth()
  if (error) return error

  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } })
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateMatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { matchId, scheduledAt, enableRoom, scoreP1, scoreP2, status, winnerId } = parsed.data

  const match = await prisma.tournamentMatch.findFirst({
    where: { id: matchId, tournamentId: params.id },
  })
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}
  if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
  if (enableRoom === true) updateData.roomEnabledAt = new Date()
  if (enableRoom === false) updateData.roomEnabledAt = null
  if (scoreP1 !== undefined) updateData.scoreP1 = scoreP1
  if (scoreP2 !== undefined) updateData.scoreP2 = scoreP2
  if (status !== undefined) {
    updateData.status = status
    if (status === 'finished' && !match.playedAt) {
      updateData.playedAt = new Date()
    }
  }
  if (winnerId !== undefined) updateData.winnerId = winnerId

  const updated = await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: updateData,
    include: {
      player1: { select: { id: true, playerName: true, cedula: true } },
      player2: { select: { id: true, playerName: true, cedula: true } },
    },
  })

  return NextResponse.json(updated)
}
