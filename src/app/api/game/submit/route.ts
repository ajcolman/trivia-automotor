// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { combinarConCuenta } from '@/lib/lead-fields'
import { createRateLimiter } from '@/lib/rate-limit'
import { calculateScore } from '@/lib/score-calculator'
import { getSessionId } from '@/lib/session-fingerprint'
import { submitGameSchema } from '@/lib/validations/lead'

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (limiter.check(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const sessionId = getSessionId(req)
  if (!sessionId) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const parsed = submitGameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const { triviaId, answers, formData } = parsed.data

  // Si quien juega tiene cuenta, el lead queda vinculado a ella. Eso es lo que
  // permite contar jugadas por persona y no por cookie, y saber a quién
  // entregarle un premio sin depender de lo que escribió en el formulario.
  const sesion = await getServerSession(authOptions)
  const playerId = sesion?.user?.role === 'player' ? sesion.user.id : null

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verify session
      const session = await tx.gameSession.findUnique({
        where: { triviaId_sessionIdentifier: { triviaId, sessionIdentifier: sessionId } },
      })
      if (!session) throw new Error('SESSION_NOT_FOUND')

      // Fetch trivia for maxPlaysPerUser check
      const trivia = await tx.trivia.findUnique({
        where: { id: triviaId },
        select: { maxPlaysPerUser: true },
      })
      if (!trivia) throw new Error('TRIVIA_NOT_FOUND')

      // Cedula/CI uniqueness check
      const cedulaField = await tx.formField.findFirst({
        where: {
          triviaId,
          fieldName: { in: ['cedula_de_identidad', 'cedula', 'ci', 'dni', 'cédula'] },
        },
        select: { fieldName: true },
      })
      if (cedulaField) {
        const cedulaValue = String((formData as Record<string, unknown>)[cedulaField.fieldName] ?? '').trim()
        if (cedulaValue) {
          const duplicate = await tx.lead.findFirst({
            where: { triviaId, formData: { path: [cedulaField.fieldName], equals: cedulaValue } },
            select: { id: true },
          })
          if (duplicate) throw new Error('DUPLICATE_CEDULA')
        }
      }

      // Una trivia que exige cuenta no acepta envíos anónimos, aunque alguien
      // llame a la API directamente.
      const t = await tx.trivia.findUnique({
        where: { id: triviaId },
        select: { requiresAccount: true, maxPlaysPerUser: true },
      })
      if (t?.requiresAccount && !playerId) throw new Error('ACCOUNT_REQUIRED')

      // Con cuenta, el límite se cuenta contra el jugador.
      if (t?.requiresAccount && playerId && t.maxPlaysPerUser > 0) {
        const jugadas = await tx.lead.count({ where: { triviaId, playerId } })
        if (jugadas >= t.maxPlaysPerUser) throw new Error('LIMIT_REACHED')
      }

      // Los datos personales se toman de la cuenta, no de lo que llegó del
      // cliente: son con los que se entrega el premio, y el formulario ya no
      // los pregunta cuando hay sesión.
      let datosFinales: Record<string, unknown> = formData as Record<string, unknown>
      if (playerId) {
        const [cuenta, campos] = await Promise.all([
          tx.player.findUnique({
            where: { id: playerId },
            select: { fullName: true, email: true, phone: true, cedula: true },
          }),
          tx.formField.findMany({
            where: { triviaId },
            select: { fieldName: true, fieldLabel: true, fieldType: true },
          }),
        ])
        if (cuenta) datosFinales = combinarConCuenta(campos, datosFinales, cuenta)
      }

      // Server-side scoring
      const questions = await tx.question.findMany({
        where: { triviaId },
        select: { id: true, correctAnswer: true, points: true, timeLimit: true },
      })

      const { score, maxScore, scoredAnswers } = calculateScore(questions, answers)

      // Create lead
      const lead = await tx.lead.create({
        data: {
          triviaId,
          playerId,
          sessionId,
          formData: datosFinales as object,
          score,
          maxScore,
          answers: scoredAnswers as object,
          ipAddress: ip,
          userAgent: req.headers.get('user-agent')?.slice(0, 255),
        },
      })

      // Mark session complete
      await tx.gameSession.update({
        where: { id: session.id },
        data: { hasCompleted: true, completedAt: new Date() },
      })

      return { score, maxScore, scoredAnswers, leadId: lead.id }
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    if (msg === 'SESSION_NOT_FOUND') {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 400 })
    }
    if (msg === 'DUPLICATE_CEDULA') {
      return NextResponse.json({ error: 'Ya existe un participante registrado con esa cédula de identidad.' }, { status: 409 })
    }
    if (msg === 'ACCOUNT_REQUIRED') {
      return NextResponse.json({ error: 'Esta trivia requiere iniciar sesión para participar.' }, { status: 401 })
    }
    if (msg === 'LIMIT_REACHED') {
      return NextResponse.json({ error: 'Ya alcanzaste el límite de participaciones.' }, { status: 409 })
    }
    console.error('Submit error:', err)
    return NextResponse.json({ error: 'Error al guardar resultados' }, { status: 500 })
  }
}
