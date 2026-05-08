// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } },
) {
  const match = await prisma.tournamentMatch.findUnique({
    where: { roomCode: params.code },
    include: {
      tournament: {
        select: { id: true, name: true, gameConfig: true },
      },
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

  if (!match) {
    return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 })
  }

  return NextResponse.json(match)
}
