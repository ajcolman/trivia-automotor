// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (limiter.check(ip)) return NextResponse.json({ ok: false }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const { path, triviaId, sessionId, referrer } = body as Record<string, string>

  if (!path) return NextResponse.json({ ok: false }, { status: 400 })

  prisma.pageView.create({
    data: {
      path: String(path).slice(0, 500),
      triviaId: triviaId || null,
      sessionId: sessionId || null,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent')?.slice(0, 255),
      referrer: referrer ? String(referrer).slice(0, 500) : null,
    },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
