// Author: Angel Colman
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { GameShell } from '@/components/game/GameShell'
import { SESSION_COOKIE_NAME } from '@/lib/session-fingerprint'
import { getNowAsuncion, stripMarkdown } from '@/lib/utils'
import type { Metadata } from 'next'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const trivia = await prisma.trivia.findUnique({
    where: { slug: params.slug },
    select: { title: true, description: true, company: { select: { name: true } } },
  })
  if (!trivia) return { title: 'Trivia no encontrada' }
  return {
    title: `${trivia.title} | ${trivia.company?.name ?? 'Automotor Trivia'}`,
    description: trivia.description ? stripMarkdown(trivia.description) : `Participa en la trivia: ${trivia.title}`,
  }
}

export default async function PlayPage({ params }: PageProps) {
  const now = getNowAsuncion()

  const trivia = await prisma.trivia.findUnique({
    where: { slug: params.slug, isActive: true },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true, question: true, options: true,
          points: true, timeLimit: true, orderIndex: true,
        },
      },
      formFields: { orderBy: { orderIndex: 'asc' } },
      prizes: { orderBy: { position: 'asc' } },
      company: { select: { id: true, name: true, logoUrl: true } },
      brands: { select: { id: true, name: true, logoUrl: true, models: true } },
    },
  })

  if (!trivia) notFound()

  // Check validity period
  const isExpired = trivia.endDate && now > trivia.endDate
  const isNotStarted = trivia.startDate && now < trivia.startDate

  // Check session - has this player already hit the limit?
  const cookieStore = cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
  let initialState: 'intro' | 'already_played' | 'expired' | 'not_started' = 'intro'

  if (isNotStarted) {
    initialState = 'not_started'
  } else if (isExpired) {
    initialState = 'expired'
  } else if (sessionId && trivia.maxPlaysPerUser > 0) {
    const session = await prisma.gameSession.findUnique({
      where: { triviaId_sessionIdentifier: { triviaId: trivia.id, sessionIdentifier: sessionId } },
    })
    if (session && session.playCount >= trivia.maxPlaysPerUser && session.hasCompleted) {
      initialState = 'already_played'
    }
  }

  // Serialize for client (strip non-serializable dates)
  const triviaData = {
    id: trivia.id,
    title: trivia.title,
    description: trivia.description,
    logoUrl: trivia.logoUrl,
    primaryColor: trivia.primaryColor,
    secondaryColor: trivia.secondaryColor,
    accentColor: trivia.accentColor,
    backgroundColor: trivia.backgroundColor,
    textColor: trivia.textColor,
    maxPlaysPerUser: trivia.maxPlaysPerUser,
    startDate: trivia.startDate?.toISOString() ?? null,
    endDate: trivia.endDate?.toISOString() ?? null,
    gameInstructions: trivia.gameInstructions ?? null,
    questions: trivia.questions.map(q => ({
      ...q,
      options: q.options as string[],
    })),
    formFields: trivia.formFields.map(f => {
      if (f.fieldType === 'brand_models') {
        const opts = trivia.brands
          .flatMap(b => (b.models as string[]).map(m => `${b.name.toUpperCase()} ${m.toUpperCase()}`))
          .sort()
        return { ...f, fieldType: 'select', options: opts }
      }
      return { ...f, options: f.options as string[] | null }
    }),
    prizes: trivia.prizes.map(p => ({ ...p, description: p.description ?? null, imageUrl: p.imageUrl ?? null })),
    company: trivia.company ? {
      id: trivia.company.id,
      name: trivia.company.name,
      logoUrl: trivia.company.logoUrl,
    } : null,
    heroImageUrl: trivia.heroImageUrl ?? null,
    heroImageSettings: (trivia.heroImageSettings as any) ?? null,
    showLeaderboard: trivia.showLeaderboard ?? true,
    brand: trivia.brands[0] ? {
      id: trivia.brands[0].id,
      name: trivia.brands[0].name,
      logoUrl: trivia.brands[0].logoUrl,
      models: trivia.brands[0].models as string[],
    } : null,
  }

  return <GameShell trivia={triviaData} initialState={initialState} />
}
