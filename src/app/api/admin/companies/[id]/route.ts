// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: { brands: true, _count: { select: { trivias: true, users: true } } },
  })
  if (!company) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json(company)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(true)
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  const company = await prisma.company.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(company)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(true)
  if (error) return error

  await prisma.company.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
