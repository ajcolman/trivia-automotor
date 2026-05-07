// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  questions: z.array(z.unknown()).optional(),
  formFields: z.array(z.unknown()).optional(),
  isPublic: z.boolean().optional(),
})

async function getTemplate(id: string, userId: string) {
  return prisma.triviaTemplate.findFirst({ where: { id, ownerId: userId } })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const template = await prisma.triviaTemplate.findFirst({
    where: {
      id: params.id,
      OR: [
        { ownerId: session.user.id },
        { shares: { some: { sharedWithId: session.user.id } } },
      ],
    },
    include: { owner: { select: { name: true } } },
  })

  if (!template) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(template)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const existing = await getTemplate(params.id, session.user.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const updated = await prisma.triviaTemplate.update({
    where: { id: params.id },
    data: parsed.data as Parameters<typeof prisma.triviaTemplate.update>[0]['data'],
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const existing = await getTemplate(params.id, session.user.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.triviaTemplate.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
