// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const createTournamentSchema = z.object({
  name: z.string().min(1).max(200),
  triviaId: z.string().optional(),
  maxPlayers: z.number().int().min(2).max(128).default(16),
  prizeConfig: z.record(z.string(), z.string()).default({}),
  gameConfig: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      trivia: { select: { id: true, title: true, slug: true } },
      _count: {
        select: {
          participants: true,
          matches: true,
        },
      },
    },
  })

  return NextResponse.json(tournaments)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = createTournamentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { name, triviaId, maxPlayers, prizeConfig, gameConfig } = parsed.data

  if (triviaId) {
    const trivia = await prisma.trivia.findUnique({ where: { id: triviaId } })
    if (!trivia) {
      return NextResponse.json({ error: 'Trivia no encontrada' }, { status: 404 })
    }
  }

  const tournament = await prisma.tournament.create({
    data: {
      name,
      triviaId: triviaId ?? null,
      maxPlayers,
      prizeConfig: prizeConfig as any,
      gameConfig: gameConfig as any,
      createdBy: session!.user.id,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      trivia: { select: { id: true, title: true, slug: true } },
    },
  })

  await logAudit({
    entityType: 'Tournament', entityId: tournament.id, entityName: tournament.name,
    action: 'CREATE', userId: session!.user.id, userName: session!.user.name ?? '', userEmail: session!.user.email ?? '',
  })

  return NextResponse.json(tournament, { status: 201 })
}
