// Author: Angel Colman
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { PredictionBoard } from '@/components/predicciones/PredictionBoard'
import type { ContenderDTO, MarketDTO } from '@/components/predicciones/tipos'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: params.slug },
    select: { title: true, description: true },
  })
  if (!evento) return { title: 'Juego no encontrado' }
  return {
    title: `${evento.title} | Automotor Play`,
    description: evento.description ?? undefined,
  }
}

export default async function PrediccionesPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)

  // Jugar exige cuenta. Guardamos a dónde volver tras iniciar sesión.
  if (!session?.user || session.user.role !== 'player') {
    redirect(`/cuenta/ingresar?volver=/predicciones/${params.slug}`)
  }

  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      title: true,
      status: true,
      rules: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      backgroundColor: true,
      textColor: true,
      prizes: {
        orderBy: { position: 'asc' },
        select: { id: true, name: true, description: true, imageUrl: true, position: true },
      },
      contenders: {
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { orderIndex: 'asc' }],
        select: {
          id: true, number: true, name: true, subtitle: true,
          teamName: true, category: true, isFeatured: true,
        },
      },
      markets: {
        orderBy: [{ orderIndex: 'asc' }],
        select: {
          id: true, type: true, title: true, config: true, locksAt: true,
          segment: {
            select: { code: true, name: true, distanceKm: true, startsAt: true, isCancelled: true },
          },
        },
      },
    },
  })

  if (!evento) notFound()

  // Un borrador solo debe verse desde el admin, no por URL directa.
  if (evento.status === 'draft') notFound()

  const predicciones = await prisma.prediction.findMany({
    where: { playerId: session.user.id, market: { eventId: evento.id } },
    select: { marketId: true, value: true, pointsAwarded: true },
  })

  const porMercado = new Map(predicciones.map(p => [p.marketId, p]))

  const markets: MarketDTO[] = evento.markets.map(m => {
    const previa = porMercado.get(m.id)
    return {
      id: m.id,
      type: m.type,
      title: m.title,
      config: (m.config ?? {}) as MarketDTO['config'],
      locksAt: m.locksAt.toISOString(),
      segment: m.segment
        ? {
            code: m.segment.code,
            name: m.segment.name,
            distanceKm: m.segment.distanceKm,
            startsAt: m.segment.startsAt?.toISOString() ?? null,
            isCancelled: m.segment.isCancelled,
          }
        : null,
      pick: (previa?.value as MarketDTO['pick']) ?? null,
      pointsAwarded: previa?.pointsAwarded ?? null,
    }
  })

  const contenders: ContenderDTO[] = evento.contenders.map(c => ({
    id: c.id,
    number: c.number,
    name: c.name,
    subtitle: c.subtitle,
    teamName: c.teamName,
    category: c.category,
    isFeatured: c.isFeatured,
  }))

  return (
    <PredictionBoard
      titulo={evento.title}
      reglas={evento.rules}
      colorPrimario={evento.primaryColor}
      colorSecundario={evento.secondaryColor}
      colorAcento={evento.accentColor}
      colorFondo={evento.backgroundColor}
      colorTexto={evento.textColor}
      markets={markets}
      contenders={contenders}
      premios={evento.prizes}
    />
  )
}
