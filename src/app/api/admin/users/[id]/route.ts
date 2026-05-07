// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { updateUserSchema } from '@/lib/validations/user'
import bcrypt from 'bcryptjs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(true)
  if (error) return error

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, role: true, isActive: true, companyId: true, createdAt: true },
  })
  if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(true)
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const updateData: Record<string, unknown> = {
    name: parsed.data.name,
    role: parsed.data.role,
    companyId: parsed.data.companyId || null,
    isActive: parsed.data.isActive,
  }

  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12)
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData as Parameters<typeof prisma.user.update>[0]['data'],
    select: { id: true, email: true, name: true, role: true, isActive: true, companyId: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(true)
  if (error) return error

  if (session.user.id === params.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
