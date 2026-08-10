// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'
import { consumeToken } from '@/lib/player-tokens'

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 })

const MENSAJES = {
  invalid: 'El enlace no es válido. Pedí uno nuevo desde tu cuenta.',
  expired: 'El enlace venció. Pedí uno nuevo desde tu cuenta.',
  used: 'Este enlace ya se usó. Tu cuenta puede estar confirmada: probá iniciar sesión.',
} as const

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (limiter.check(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá un minuto.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''

  const resultado = await consumeToken(token, 'email_verification')
  if (!resultado.ok) {
    return NextResponse.json({ error: MENSAJES[resultado.reason] }, { status: 400 })
  }

  await prisma.player.update({
    where: { id: resultado.playerId },
    data: { emailVerifiedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
