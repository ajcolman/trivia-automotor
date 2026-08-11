// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'

/** Lista de jugadores, con búsqueda por nombre, correo o cédula. */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''

  const where: Prisma.PlayerWhereInput = q
    ? {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { cedula: { contains: q.replace(/[^0-9]/g, '') } },
          { phone: { contains: q } },
        ],
      }
    : {}

  const players = await prisma.player.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true, fullName: true, email: true, phone: true, cedula: true,
      emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
      _count: { select: { predictions: true } },
    },
  })

  return NextResponse.json(players)
}
