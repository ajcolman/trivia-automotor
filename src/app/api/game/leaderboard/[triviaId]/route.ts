// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const data = lead.formData as Record<string, string>
    const rawName = data.nombre || data.name || 'Participante'
    const rawLastName = data.apellido || data.lastName || ''
    const firstName = rawName.split(' ')[0]
    const lastInitial = rawLastName ? rawLastName[0].toUpperCase() + '.' : ''
    return {
      position: index + 1,
      displayName: lastInitial ? `${firstName} ${lastInitial}` : firstName,
      score: lead.score,
      maxScore: lead.maxScore,
      completedAt: lead.completedAt,
    }
  })

  return NextResponse.json(leaderboard)
}
