// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'
import { playerRegisterSchema, normalizeCedula } from '@/lib/validations/player'
import { issueToken, appUrl } from '@/lib/player-tokens'
import { sendEmail, verificationEmail } from '@/lib/email'

const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })

const BCRYPT_ROUNDS = 12
/** Versión de los términos que el jugador acepta al registrarse. */
const TERMS_VERSION = '2026-08'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (limiter.check(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá un minuto y probá de nuevo.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = playerRegisterSchema.safeParse(body)
  if (!parsed.success) {
    const primero = parsed.error.issues[0]
    return NextResponse.json(
      { error: primero?.message ?? 'Revisá los datos', campo: primero?.path[0] },
      { status: 400 },
    )
  }

  const { fullName, email, phone, cedula, password } = parsed.data
  const cedulaNormalizada = normalizeCedula(cedula)

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  try {
    const player = await prisma.player.create({
      data: {
        fullName,
        email,
        phone,
        cedula: cedulaNormalizada,
        passwordHash,
        acceptedTermsAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
      select: { id: true, email: true, fullName: true },
    })

    // Verificación de correo. Si el envío falla la cuenta igual queda creada:
    // el jugador puede pedir el enlace de nuevo y no perdemos el registro por
    // un problema del proveedor de correo.
    const token = await issueToken(player.id, 'email_verification')
    const { sent } = await sendEmail({
      to: player.email,
      ...verificationEmail(player.fullName, appUrl(`/cuenta/verificar?token=${token}`)),
    })

    return NextResponse.json({ ok: true, player, correoEnviado: sent }, { status: 201 })
  } catch (e) {
    // Choque de únicos: el correo o la cédula ya están registrados. Prisma
    // informa cuál campo en `meta.target`.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = (e.meta?.target as string[] | undefined)?.join(',') ?? ''
      const esCedula = target.includes('cedula')
      return NextResponse.json(
        {
          error: esCedula
            ? 'Ya hay una cuenta registrada con esa cédula.'
            : 'Ya hay una cuenta con ese correo. Iniciá sesión.',
          campo: esCedula ? 'cedula' : 'email',
        },
        { status: 409 },
      )
    }
    console.error('[player/register]', e)
    return NextResponse.json(
      { error: 'No pudimos crear la cuenta. Probá de nuevo en un momento.' },
      { status: 500 },
    )
  }
}
