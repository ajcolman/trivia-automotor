// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const brandSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1).max(200),
  logoUrl: z.string().url().optional().or(z.literal('')),
  models: z.array(z.string().min(1).max(100)).default([]),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  const brands = await prisma.brand.findMany({
    where: companyId ? { companyId } : {},
    orderBy: { name: 'asc' },
    include: { company: { select: { name: true } } },
  })

  return NextResponse.json(brands)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(true)
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = brandSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const brand = await prisma.brand.create({ data: { ...parsed.data, models: parsed.data.models } })
  return NextResponse.json(brand, { status: 201 })
}
