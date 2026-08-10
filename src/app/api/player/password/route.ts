// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { playerPasswordSchema } from '@/lib/validations/player'

const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
const BCRYPT_ROUNDS = 12

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'player') {
    return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  }
  if (limiter.check(session.user.id)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá un minuto.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = playerPasswordSchema.safeParse(body)
  if (!parsed.success) {
    const primero = parsed.error.issues[0]
    return NextResponse.json(
      { error: primero?.message ?? 'Revisá los datos', campo: primero?.path[0] },
      { status: 400 },
    )
  }

  const { currentPassword, newPassword } = parsed.data

  const player = await prisma.player.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!player) {
    return NextResponse.json({ error: 'No encontramos tu cuenta.' }, { status: 404 })
  }

  const coincide = await bcrypt.compare(currentPassword, player.passwordHash)
  if (!coincide) {
    return NextResponse.json(
      { error: 'La contraseña actual no es correcta.', campo: 'currentPassword' },
      { status: 400 },
    )
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: 'La contraseña nueva tiene que ser distinta de la actual.', campo: 'newPassword' },
      { status: 400 },
    )
  }

  await prisma.player.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  })

  // Los enlaces de recuperación pendientes dejan de servir: si alguien pidió
  // uno para secuestrar la cuenta, cambiar la contraseña lo anula.
  await prisma.playerToken.updateMany({
    where: { playerId: session.user.id, type: 'password_reset', usedAt: null },
    data: { usedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
