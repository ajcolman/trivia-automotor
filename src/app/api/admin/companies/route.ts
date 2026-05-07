// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const companySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

export async function GET(_req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { brands: true, trivias: true, users: true } },
    },
  })

  return NextResponse.json(companies)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(true)
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = companySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const company = await prisma.company.create({ data: parsed.data })
  return NextResponse.json(company, { status: 201 })
}
