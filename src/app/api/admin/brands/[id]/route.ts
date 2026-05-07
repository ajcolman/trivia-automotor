// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  models: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(true)
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  const brand = await prisma.brand.update({ where: { id: params.id }, data: parsed.data as Parameters<typeof prisma.brand.update>[0]['data'] })
  return NextResponse.json(brand)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(true)
  if (error) return error

  await prisma.brand.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
