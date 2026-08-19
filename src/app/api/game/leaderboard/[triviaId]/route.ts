// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { participantName } from '@/lib/participant-name'

export async function GET(
  _req: NextRequest,
  { params }: { params: { triviaId: string } },
) {
  const leads = await prisma.lead.findMany({
    where: { triviaId: params.triviaId },
    orderBy: [{ score: 'desc' }, { completedAt: 'asc' }],
    take: 10,
    select: {
      id: true,
      formData: true,
      score: true,
      maxScore: true,
      completedAt: true,
    },
  })

  const leaderboard = leads.map((lead, index) => {
    return {
      position: index + 1,
      // La tabla es pública, así que va abreviado: "Juan P.".
      displayName: participantName(lead.formData).abreviado,
      score: lead.score,
      maxScore: lead.maxScore,
      completedAt: lead.completedAt,
    }
  })

  return NextResponse.json(leaderboard)
}
