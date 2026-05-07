// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  buildSessionCookieHeader,
} from '@/lib/session-fingerprint'
import { v4 as uuidv4 } from 'uuid'

const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (limiter.check(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.triviaId) {
    return NextResponse.json({ error: 'triviaId requerido' }, { status: 400 })
  }

  const now = new Date()
  const trivia = await prisma.trivia.findUnique({
    where: { id: body.triviaId, isActive: true },
    select: { id: true, maxPlaysPerUser: true, startDate: true, endDate: true },
  })

  if (!trivia) {
    return NextResponse.json({ error: 'Trivia no encontrada' }, { status: 404 })
  }
  if (trivia.startDate && now < trivia.startDate) {
    return NextResponse.json({ error: 'not_started' }, { status: 403 })
  }
  if (trivia.endDate && now > trivia.endDate) {
    return NextResponse.json({ error: 'expired' }, { status: 403 })
  }

  // Get or create session ID
  let sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value
  const isNewSession = !sessionId
  if (!sessionId) sessionId = uuidv4()

  // Check existing session
  const existing = await prisma.gameSession.findUnique({
    where: {
      triviaId_sessionIdentifier: {
        triviaId: trivia.id,
        sessionIdentifier: sessionId,
      },
    },
  })

  // Enforce max plays limit (0 = unlimited)
  if (existing && trivia.maxPlaysPerUser > 0 && existing.playCount >= trivia.maxPlaysPerUser) {
    const res = NextResponse.json({
      allowed: false,
      playCount: existing.playCount,
      message: `Ya alcanzaste el límite de ${trivia.maxPlaysPerUser} participación(es).`,
    })
    return res
  }

  // Upsert session
  const session = await prisma.gameSession.upsert({
    where: {
      triviaId_sessionIdentifier: {
        triviaId: trivia.id,
        sessionIdentifier: sessionId,
      },
    },
    update: { playCount: { increment: 1 }, hasCompleted: false, completedAt: null },
    create: {
      triviaId: trivia.id,
      sessionIdentifier: sessionId,
      playCount: 1,
    },
  })

  const res = NextResponse.json({ allowed: true, playCount: session.playCount })

  if (isNewSession) {
    res.headers.set('Set-Cookie', buildSessionCookieHeader(sessionId, SESSION_COOKIE_MAX_AGE))
  }

  return res
}
