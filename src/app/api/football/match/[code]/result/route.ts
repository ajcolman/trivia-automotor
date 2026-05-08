// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const resultSchema = z.object({
  scoreP1: z.number().int().min(0),
  scoreP2: z.number().int().min(0),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  const body = await req.json().catch(() => null)
  const parsed = resultSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { scoreP1, scoreP2 } = parsed.data

  const match = await prisma.tournamentMatch.findUnique({
    where: { roomCode: params.code },
    include: { player1: true, player2: true },
  })

  if (!match) {
    return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
  }

  if (match.status === 'finished') {
    return NextResponse.json({ error: 'Partida ya finalizada' }, { status: 409 })
  }

  // Determine winner: null for draw
  let winnerId: string | null = null
  if (scoreP1 > scoreP2) {
    winnerId = match.player1Id
  } else if (scoreP2 > scoreP1) {
    winnerId = match.player2Id
  }

  const updated = await prisma.tournamentMatch.update({
    where: { roomCode: params.code },
    data: {
      scoreP1,
      scoreP2,
      winnerId,
      status: 'finished',
      playedAt: new Date(),
    },
    include: {
      player1: {
        select: {
          id: true,
          playerName: true,
          cedula: true,
          vehicle: {
            select: { id: true, spriteUrl: true, modelName: true, isGeneric: true, genericType: true },
          },
        },
      },
      player2: {
        select: {
          id: true,
          playerName: true,
          cedula: true,
          vehicle: {
            select: { id: true, spriteUrl: true, modelName: true, isGeneric: true, genericType: true },
          },
        },
      },
    },
  })

  return NextResponse.json(updated)
}
