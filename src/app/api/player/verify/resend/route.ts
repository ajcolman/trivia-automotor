// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { issueToken, appUrl } from '@/lib/player-tokens'
import { sendEmail, verificationEmail } from '@/lib/email'

/**
 * Reenvía el correo de verificación al jugador que tiene la sesión abierta.
 *
 * Hasta ahora el enlace se emitía una sola vez, en el registro: si ese correo
 * se perdía, caía en spam o vencía, la cuenta quedaba sin confirmar para
 * siempre y sin manera de arreglarlo desde la interfaz.
 *
 * Va contra la sesión y no contra un correo que venga en el cuerpo, así nadie
 * puede usar esta ruta para averiguar qué direcciones están registradas ni
 * para tirarle mensajes a una casilla ajena.
 */
const limiter = createRateLimiter({ limit: 3, windowMs: 15 * 60 * 1000 })

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'player') {
    return NextResponse.json({ error: 'Iniciá sesión para pedir el enlace.' }, { status: 401 })
  }

  if (limiter.check(`verify-resend:${session.user.id}`)) {
    return NextResponse.json(
      { error: 'Ya te mandamos varios enlaces. Esperá unos minutos y revisá también el correo no deseado.' },
      { status: 429 },
    )
  }

  const player = await prisma.player.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, fullName: true, emailVerifiedAt: true, isActive: true },
  })

  if (!player || !player.isActive) {
    return NextResponse.json({ error: 'No encontramos tu cuenta.' }, { status: 404 })
  }

  if (player.emailVerifiedAt) {
    return NextResponse.json({ ok: true, yaVerificado: true })
  }

  // `issueToken` invalida los enlaces anteriores: siempre vale el último.
  const token = await issueToken(player.id, 'email_verification')
  const { sent } = await sendEmail({
    to: player.email,
    ...verificationEmail(player.fullName, appUrl(`/cuenta/verificar?token=${token}`)),
  })

  if (!sent) {
    return NextResponse.json(
      { error: 'No pudimos enviar el correo en este momento. Probá de nuevo en unos minutos.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, email: player.email })
}
