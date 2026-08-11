// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'
import { issueToken, appUrl } from '@/lib/player-tokens'
import { sendEmail, passwordResetEmail } from '@/lib/email'

const limiter = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 })

const esquema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

/**
 * Pide un enlace para restablecer la contraseña.
 *
 * Responde siempre lo mismo, exista o no la cuenta: si dijéramos "no
 * encontramos ese correo" cualquiera podría averiguar qué direcciones están
 * registradas probando de a una.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (limiter.check(ip)) {
    return NextResponse.json(
      { error: 'Pediste demasiados enlaces. Esperá unos minutos.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = esquema.safeParse(body)

  // Incluso con un correo mal escrito respondemos igual, para no filtrar nada
  // por la diferencia entre una respuesta y otra.
  if (!parsed.success) return NextResponse.json({ ok: true })

  const player = await prisma.player.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, fullName: true, email: true, isActive: true },
  })

  if (player && player.isActive) {
    const token = await issueToken(player.id, 'password_reset')
    await sendEmail({
      to: player.email,
      ...passwordResetEmail(
        player.fullName,
        appUrl(`/cuenta/restablecer?token=${token}`),
      ),
    })
  }

  return NextResponse.json({ ok: true })
}
