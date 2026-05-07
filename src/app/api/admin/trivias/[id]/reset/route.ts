// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const trivia = await prisma.trivia.findUnique({ where: { id: params.id } })
  if (!trivia) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Only allow reset when trivia is not active (test/draft mode)
  if (trivia.isActive) {
    return NextResponse.json(
      { error: 'No se puede resetear una trivia activa. Desactivala primero.' },
      { status: 409 }
    )
  }

  const [leads, sessions, views] = await prisma.$transaction([
    prisma.lead.deleteMany({ where: { triviaId: params.id } }),
    prisma.gameSession.deleteMany({ where: { triviaId: params.id } }),
    prisma.pageView.deleteMany({ where: { triviaId: params.id } }),
  ])

  return NextResponse.json({
    ok: true,
    deleted: { leads: leads.count, sessions: sessions.count, pageViews: views.count },
  })
}
