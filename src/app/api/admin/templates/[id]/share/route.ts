// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const template = await prisma.triviaTemplate.findUnique({ where: { id: params.id } })
  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  if (template.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Solo el propietario puede compartir esta plantilla' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  if (body.userId === session.user.id) {
    return NextResponse.json({ error: 'No puedes compartir contigo mismo' }, { status: 400 })
  }

  const share = await prisma.templateShare.upsert({
    where: { templateId_sharedWithId: { templateId: params.id, sharedWithId: body.userId } },
    update: {},
    create: { templateId: params.id, sharedWithId: body.userId },
  })

  return NextResponse.json(share, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body?.userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  const template = await prisma.triviaTemplate.findUnique({ where: { id: params.id } })
  if (!template) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (template.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  await prisma.templateShare.delete({
    where: { templateId_sharedWithId: { templateId: params.id, sharedWithId: body.userId } },
  })

  return NextResponse.json({ ok: true })
}
