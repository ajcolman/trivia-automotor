// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { createUserSchema } from '@/lib/validations/user'
import bcrypt from 'bcryptjs'

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth(true)
  if (error) return error

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, role: true, isActive: true,
      createdAt: true, updatedAt: true, companyId: true,
      company: { select: { name: true } },
    },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(true)
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return NextResponse.json({ error: 'El email ya está en uso' }, { status: 409 })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role as 'super_admin' | 'admin',
      companyId: parsed.data.companyId || null,
    },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
