// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAuth()
  if (error) return error

  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: { participants: true },
  })

  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  if (tournament.status !== 'pending') {
    return NextResponse.json(
      { error: 'El torneo ya fue iniciado o está finalizado' },
      { status: 409 },
    )
  }

  const participants = tournament.participants
  if (participants.length < 2) {
    return NextResponse.json(
      { error: 'Se necesitan al menos 2 participantes para generar el bracket' },
      { status: 422 },
    )
  }

  // Delete any existing matches for round 1 if re-generating
  await prisma.tournamentMatch.deleteMany({
    where: { tournamentId: params.id },
  })

  const shuffled = shuffle(participants)
  const matchData: {
    tournamentId: string
    player1Id: string
    player2Id: string
    round: number
  }[] = []

  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    matchData.push({
      tournamentId: params.id,
      player1Id: shuffled[i].id,
      player2Id: shuffled[i + 1].id,
      round: 1,
    })
  }
  // If odd number of participants, last one gets a bye (no match created for them in round 1)

  const [matches] = await prisma.$transaction([
    prisma.tournamentMatch.createManyAndReturn({
      data: matchData,
      include: {
        player1: { select: { id: true, playerName: true, cedula: true } },
        player2: { select: { id: true, playerName: true, cedula: true } },
      },
    }),
    prisma.tournament.update({
      where: { id: params.id },
      data: { status: 'active' },
    }),
  ])

  return NextResponse.json(
    {
      matches,
      byeParticipant: shuffled.length % 2 !== 0 ? shuffled[shuffled.length - 1] : null,
    },
    { status: 201 },
  )
}
