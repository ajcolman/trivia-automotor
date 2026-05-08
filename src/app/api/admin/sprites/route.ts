// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const spriteSchema = z.object({
  brandId: z.string().min(1).optional().nullable(),
  modelName: z.string().min(1).max(200).optional().nullable(),
  spriteUrl: z.string().url(),
  isGeneric: z.boolean().default(false),
  genericType: z.enum(['sedan', 'truck', 'suv']).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const sprites = await prisma.vehicleSprite.findMany({
    orderBy: { createdAt: 'desc' },
    include: { brand: { select: { id: true, name: true } } },
  })

  return NextResponse.json(sprites)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(true)
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = spriteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const sprite = await prisma.vehicleSprite.create({ data: parsed.data })
  return NextResponse.json(sprite, { status: 201 })
}
