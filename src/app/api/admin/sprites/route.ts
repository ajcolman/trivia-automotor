// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { z } from 'zod'

const spriteSchema = z.object({
  brandId: z.string().min(1).optional().nullable(),
  modelName: z.string().min(1).max(200).optional().nullable(),
  spriteUrl: z.string().min(1).refine(
    (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'Debe ser una URL completa o una ruta relativa que empiece con /' }
  ),
  /** Video en loop, si el sprite está animado. */
  loopUrl: z.string().max(500).optional().nullable(),
  /** Primer cuadro del loop, mientras el video no cargó. */
  posterUrl: z.string().max(500).optional().nullable(),
  /** El archivo trae fondo negro en vez de transparencia. */
  blackBackground: z.boolean().default(false),
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
