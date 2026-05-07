// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  // Check ownership
  const trivia = await prisma.trivia.findUnique({ where: { id: params.id } })
  if (!trivia) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  
  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Delete all leads and game sessions for this trivia
  await prisma.$transaction([
    prisma.lead.deleteMany({ where: { triviaId: params.id } }),
    prisma.gameSession.deleteMany({ where: { triviaId: params.id } }),
    prisma.pageView.deleteMany({ where: { triviaId: params.id } })
  ])

  return NextResponse.json({ ok: true, message: 'Trivia reseteada exitosamente' })
}
