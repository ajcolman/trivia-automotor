// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const updateTournamentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['pending', 'active', 'finished']).optional(),
  maxPlayers: z.number().int().min(2).max(128).optional(),
  prizeConfig: z.record(z.string(), z.string()).optional(),
  gameConfig: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAuth()
  if (error) return error

  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      trivia: { select: { id: true, title: true, slug: true } },
      participants: {
        orderBy: { seed: 'asc' },
        include: {
          vehicle: { select: { id: true, spriteUrl: true, modelName: true, isGeneric: true, genericType: true } },
        },
      },
      matches: {
        orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
        include: {
          player1: { select: { id: true, playerName: true, cedula: true } },
          player2: { select: { id: true, playerName: true, cedula: true } },
        },
      },
    },
  })

  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  return NextResponse.json(tournament)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await requireAuth()
  if (error) return error

  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } })
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateTournamentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const updated = await prisma.tournament.update({
    where: { id: params.id },
    data: parsed.data as any,
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

  await logAudit({
    entityType: 'Tournament', entityId: updated.id, entityName: updated.name,
    action: 'UPDATE', userId: session!.user.id, userName: session!.user.name ?? '', userEmail: session!.user.email ?? '',
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await requireAuth(true)
  if (error) return error

  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } })
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  await logAudit({
    entityType: 'Tournament', entityId: params.id, entityName: tournament.name,
    action: 'DELETE', userId: session!.user.id, userName: session!.user.name ?? '', userEmail: session!.user.email ?? '',
  })

  await prisma.tournament.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
