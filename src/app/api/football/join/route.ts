// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const joinSchema = z.object({
  tournamentId: z.string().min(1),
  cedula: z.string().min(1).max(20).regex(/^\d+$/, 'La cédula debe contener solo números'),
  playerName: z.string().min(1).max(200).trim(),
  vehicleId: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = joinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { tournamentId, cedula, playerName, vehicleId } = parsed.data

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { participants: true } } },
  })

  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  if (tournament.status !== 'pending') {
    return NextResponse.json(
      { error: 'El torneo ya no está abierto para inscripciones' },
      { status: 409 },
    )
  }

  if (tournament._count.participants >= tournament.maxPlayers) {
    return NextResponse.json(
      { error: 'El torneo está completo' },
      { status: 409 },
    )
  }

  const existing = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_cedula: { tournamentId, cedula } },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Ya estás registrado en este torneo con esa cédula' },
      { status: 409 },
    )
  }

  if (vehicleId) {
    const sprite = await prisma.vehicleSprite.findUnique({ where: { id: vehicleId } })
    if (!sprite) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
    }
  }

  const participant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId,
      cedula,
      playerName: playerName.trim(),
      vehicleId: vehicleId ?? null,
    },
    include: {
      vehicle: {
        select: { id: true, spriteUrl: true, modelName: true, isGeneric: true, genericType: true },
      },
      tournament: { select: { id: true, name: true, maxPlayers: true } },
    },
  })

  return NextResponse.json(participant, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tournamentId = searchParams.get('tournamentId')

  if (!tournamentId) {
    return NextResponse.json({ error: 'tournamentId requerido' }, { status: 400 })
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      _count: { select: { participants: true } },
      participants: {
        orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
        include: {
          vehicle: {
            select: { id: true, spriteUrl: true, modelName: true, isGeneric: true, genericType: true },
          },
        },
      },
    },
  })

  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  const sprites = await prisma.vehicleSprite.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, spriteUrl: true, modelName: true, isGeneric: true, genericType: true },
  })

  return NextResponse.json({ tournament, sprites })
}
