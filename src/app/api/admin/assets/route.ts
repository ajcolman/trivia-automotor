// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const where = isSuperAdmin(session.user.role) ? {} : { uploadedBy: session.user.id }

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { uploader: { select: { name: true } } },
  })

  return NextResponse.json(assets)
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const asset = await prisma.asset.findUnique({ where: { id: body.id } })
  if (!asset) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && asset.uploadedBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  await prisma.asset.delete({ where: { id: body.id } })
  return NextResponse.json({ ok: true })
}
