// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { playerProfileSchema, normalizeCedula } from '@/lib/validations/player'
import { issueToken, appUrl } from '@/lib/player-tokens'
import { sendEmail, verificationEmail } from '@/lib/email'

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 })

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'player') {
    return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  }
  if (limiter.check(session.user.id)) {
    return NextResponse.json({ error: 'Demasiados cambios seguidos. Esperá un momento.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = playerProfileSchema.safeParse(body)
  if (!parsed.success) {
    const primero = parsed.error.issues[0]
    return NextResponse.json(
      { error: primero?.message ?? 'Revisá los datos', campo: primero?.path[0] },
      { status: 400 },
    )
  }

  const actual = await prisma.player.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })
  if (!actual) {
    return NextResponse.json({ error: 'No encontramos tu cuenta.' }, { status: 404 })
  }

  const { fullName, email, phone, cedula } = parsed.data
  const cambióCorreo = email !== actual.email

  try {
    const player = await prisma.player.update({
      where: { id: session.user.id },
      data: {
        fullName,
        email,
        phone,
        cedula: normalizeCedula(cedula),
        // Un correo nuevo vuelve a estar sin verificar: si no, alcanzaría con
        // cambiarlo para tener por confirmada una dirección ajena.
        ...(cambióCorreo ? { emailVerifiedAt: null } : {}),
      },
      select: { id: true, fullName: true, email: true, emailVerifiedAt: true },
    })

    if (cambióCorreo) {
      const token = await issueToken(player.id, 'email_verification')
      await sendEmail({
        to: player.email,
        ...verificationEmail(player.fullName, appUrl(`/cuenta/verificar?token=${token}`)),
      })
    }

    return NextResponse.json({ ok: true, player, verificarCorreo: cambióCorreo })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = (e.meta?.target as string[] | undefined)?.join(',') ?? ''
      const esCedula = target.includes('cedula')
      return NextResponse.json(
        {
          error: esCedula
            ? 'Esa cédula ya está registrada en otra cuenta.'
            : 'Ese correo ya está registrado en otra cuenta.',
          campo: esCedula ? 'cedula' : 'email',
        },
        { status: 409 },
      )
    }
    console.error('[player/profile]', e)
    return NextResponse.json({ error: 'No pudimos guardar los cambios.' }, { status: 500 })
  }
}
