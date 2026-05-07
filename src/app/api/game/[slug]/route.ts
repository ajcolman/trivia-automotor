// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 })

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (limiter.check(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const now = new Date()

  const trivia = await prisma.trivia.findUnique({
    where: { slug: params.slug, isActive: true },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          question: true,
          options: true,
          points: true,
          timeLimit: true,
          orderIndex: true,
          // correctAnswer intentionally excluded
        },
      },
      formFields: { orderBy: { orderIndex: 'asc' } },
      prizes: { orderBy: { position: 'asc' } },
      company: { select: { id: true, name: true, logoUrl: true } },
      brands: { select: { id: true, name: true, logoUrl: true, models: true } },
    },
  })

  if (!trivia) {
    return NextResponse.json({ error: 'Trivia no encontrada' }, { status: 404 })
  }

  // Check validity period
  if (trivia.startDate && now < trivia.startDate) {
    return NextResponse.json({ error: 'not_started', startDate: trivia.startDate }, { status: 403 })
  }
  if (trivia.endDate && now > trivia.endDate) {
    return NextResponse.json({ error: 'expired', endDate: trivia.endDate }, { status: 403 })
  }

  // Track page view (fire and forget)
  const sessionId = req.cookies.get('trivia_session_id')?.value
  prisma.pageView.create({
    data: {
      triviaId: trivia.id,
      path: `/play/${params.slug}`,
      sessionId: sessionId ?? null,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent')?.slice(0, 255),
      referrer: req.headers.get('referer')?.slice(0, 500),
    },
  }).catch(() => {})

  // Auto-populate brand_models fields with "MARCA MODELO" options
  const brandModelOptions = trivia.brands
    .flatMap(b => (b.models as string[]).map(m => `${b.name.toUpperCase()} ${m.toUpperCase()}`))
    .sort()

  const formFields = trivia.formFields.map(f => {
    if ((f.fieldType as string) === 'brand_models') {
      return { ...f, fieldType: 'select', options: brandModelOptions }
    }
    return f
  })

  return NextResponse.json({
    ...trivia,
    brand: trivia.brands[0] ?? null, // backward compat for IntroScreen/ResultScreen
    formFields,
  })
}
