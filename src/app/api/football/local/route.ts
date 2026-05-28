// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface LocalMatchBody {
  player1: { cedula: string; playerName: string; vehicleId?: string }
  player2: { cedula: string; playerName: string; vehicleId?: string }
  scoreP1: number
  scoreP2: number
  tournamentMatchCode?: string
}

export async function POST(req: NextRequest) {
  let body: LocalMatchBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { player1, player2, scoreP1, scoreP2, tournamentMatchCode } = body

  if (
    !player1?.cedula ||
    !player1?.playerName ||
    !player2?.cedula ||
    !player2?.playerName ||
    typeof scoreP1 !== 'number' ||
    typeof scoreP2 !== 'number'
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    if (tournamentMatchCode) {
      const match = await prisma.tournamentMatch.findUnique({
        where: { roomCode: tournamentMatchCode },
        include: { player1: true, player2: true },
      })

      if (!match) {
        return NextResponse.json({ error: 'Tournament match not found' }, { status: 404 })
      }

      await prisma.tournamentMatch.update({
        where: { id: match.id },
        data: {
          scoreP1,
          scoreP2,
          status: 'finished',
          playedAt: new Date(),
          winnerId: scoreP1 >= scoreP2 ? match.player1Id : match.player2Id,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/football/local] Error saving local match:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
