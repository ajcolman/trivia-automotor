// Author: Angel Colman
import { prisma } from '@/lib/prisma'
import LocalGameSetup from './LocalGameSetup'

export const dynamic = 'force-dynamic'

export default async function LocalPage() {
  const [sprites, tournaments] = await Promise.all([
    prisma.vehicleSprite.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        spriteUrl: true,
        modelName: true,
        isGeneric: true,
        genericType: true,
        brand: { select: { name: true } },
      },
    }),
    prisma.tournament.findMany({
      where: { status: 'active' },
      include: {
        matches: {
          where: { status: { not: 'finished' } },
          select: {
            roomCode: true,
            player1: { select: { playerName: true, cedula: true } },
            player2: { select: { playerName: true, cedula: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return <LocalGameSetup sprites={sprites} tournaments={tournaments} />
}
