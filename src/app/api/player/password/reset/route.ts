// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'
import { consumeToken } from '@/lib/player-tokens'

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 })
const BCRYPT_ROUNDS = 12

const esquema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'La contraseña necesita al menos 8 caracteres')
    .max(72, 'La contraseña es demasiado larga'),
})

const MENSAJES = {
  invalid: 'El enlace no es válido. Pedí uno nuevo.',
  expired: 'El enlace venció. Pedí uno nuevo.',
  used: 'Este enlace ya se usó. Si no fuiste vos, pedí otro enseguida.',
} as const

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (limiter.check(ip)) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un minuto.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = esquema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos', campo: 'newPassword' },
      { status: 400 },
    )
  }

  const resultado = await consumeToken(parsed.data.token, 'password_reset')
  if (!resultado.ok) {
    return NextResponse.json({ error: MENSAJES[resultado.reason] }, { status: 400 })
  }

  await prisma.player.update({
    where: { id: resultado.playerId },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS) },
  })

  // Cualquier otro enlace de recuperación pendiente deja de servir: si alguien
  // más pidió uno para entrar a la cuenta, acá se le corta.
  await prisma.playerToken.updateMany({
    where: { playerId: resultado.playerId, type: 'password_reset', usedAt: null },
    data: { usedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
