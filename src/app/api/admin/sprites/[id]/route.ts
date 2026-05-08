// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(true)
  if (error) return error

  await prisma.vehicleSprite.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
