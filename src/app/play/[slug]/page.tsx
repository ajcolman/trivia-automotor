// Author: Angel Colman
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
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

  // Trivias con premio pueden exigir cuenta: no se le entrega un premio a una
  // cookie, y el límite de jugadas solo es real si hay una cuenta detrás.
  const session = await getServerSession(authOptions)
  const playerId = session?.user?.role === 'player' ? session.user.id : null

  if (trivia.requiresAccount && !playerId) {
    redirect(`/cuenta/ingresar?volver=/play/${params.slug}`)
  }

  // Datos de la cuenta, para no volver a pedir lo que ya sabemos.
  const player = playerId
    ? await prisma.player.findUnique({
        where: { id: playerId },
        select: { fullName: true, email: true, phone: true, cedula: true },
      })
    : null

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
  } else if (trivia.requiresAccount && playerId && trivia.maxPlaysPerUser > 0) {
    // Con cuenta, el límite se cuenta contra el jugador: borrar la cookie ya
    // no alcanza para volver a jugar.
    const jugadas = await prisma.lead.count({
      where: { triviaId: trivia.id, playerId },
    })
    if (jugadas >= trivia.maxPlaysPerUser) {
      initialState = 'already_played'
    }
  } else if (sessionId && trivia.maxPlaysPerUser > 0) {
    const jugada = await prisma.gameSession.findUnique({
      where: { triviaId_sessionIdentifier: { triviaId: trivia.id, sessionIdentifier: sessionId } },
    })
    if (jugada && jugada.playCount >= trivia.maxPlaysPerUser && jugada.hasCompleted) {
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
    requiresAccount: trivia.requiresAccount,
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

  return <GameShell trivia={triviaData} initialState={initialState} cuenta={player} />
}
