// Author: Angel Colman
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { PredictionBoard } from '@/components/predicciones/PredictionBoard'
import { publicLeaderboard } from '@/lib/predictions/resolver'
import { ALTO_BANNER_PREDICCION, resolveHeroImageSettings } from '@/lib/hero-image'
import { siteUrl } from '@/lib/site-url'
import { PortadaPublica } from '@/components/predicciones/PortadaPublica'
import type { ContenderDTO, MarketDTO } from '@/components/predicciones/tipos'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: params.slug },
    select: { title: true, description: true, status: true, _count: { select: { markets: true } } },
  })
  if (!evento) return { title: 'Juego no encontrado' }

  // Un borrador no se comparte: que no lo indexen ni le armen tarjeta.
  if (evento.status === 'draft') {
    return { title: 'Juego no encontrado', robots: { index: false, follow: false } }
  }

  const titulo = `${evento.title} | Automotor Play`
  const bajada =
    evento.description?.trim() ||
    `Cargá tus pronósticos${evento._count.markets ? ` en ${evento._count.markets} predicciones` : ''} y competí por premios en Automotor Play.`
  const url = `${siteUrl()}/predicciones/${params.slug}`

  return {
    title: titulo,
    description: bajada,
    alternates: { canonical: url },
    // La imagen la arma `opengraph-image.tsx`; Next la enlaza sola.
    openGraph: { type: 'article', url, title: titulo, description: bajada, siteName: 'Automotor Play' },
    twitter: { card: 'summary_large_image', title: titulo, description: bajada },
  }
}

export default async function PrediccionesPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)

  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      title: true,
      status: true,
      description: true,
      rules: true,
      showLeaderboard: true,
      heroImageUrl: true,
      heroImageSettings: true,
      brand: { select: { name: true, logoUrl: true } },
      vehicleSprite: {
        select: {
          spriteUrl: true, modelName: true,
          loopUrl: true, posterUrl: true, blackBackground: true,
        },
      },
      showVehicle: true,
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
          // Sin filas se pueden elegir todos: así son los juegos que no
          // declaran elegibilidad.
          eligible: { select: { contenderId: true } },
        },
      },
    },
  })

  if (!evento) notFound()

  // Un borrador solo debe verse desde el admin, no por URL directa.
  if (evento.status === 'draft') notFound()

  // Jugar exige cuenta, pero mirar no: quien llega por un enlace compartido
  // ve de qué va el juego y recién ahí se le pide entrar.
  if (!session?.user || session.user.role !== 'player') {
    return (
      <PortadaPublica
        slug={params.slug}
        titulo={evento.title}
        descripcion={evento.description}
        reglas={evento.rules}
        estado={evento.status}
        banner={evento.heroImageUrl}
        bannerSettings={evento.heroImageSettings}
        marca={evento.brand}
        premios={evento.prizes}
        colorPrimario={evento.primaryColor}
        colorSecundario={evento.secondaryColor}
        cantidadPredicciones={evento.markets.length}
        cantidadParticipantes={evento.contenders.length}
      />
    )
  }

  const predicciones = await prisma.prediction.findMany({
    where: { playerId: session.user.id, market: { eventId: evento.id } },
    select: { marketId: true, value: true, pointsAwarded: true },
  })

  const porMercado = new Map(predicciones.map(p => [p.marketId, p]))

  // Con el ranking apagado desde el admin ni siquiera se calcula: es una
  // consulta sobre todas las predicciones del evento que nadie va a ver.
  const ranking = evento.showLeaderboard
    ? await publicLeaderboard(evento.id, session.user.id)
    : null

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
      contenderIds: m.eligible.length > 0 ? m.eligible.map(e => e.contenderId) : null,
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
      ranking={ranking}
      banner={evento.heroImageUrl}
      bannerSettings={
        evento.heroImageUrl
          ? resolveHeroImageSettings(evento.heroImageSettings as never, ALTO_BANNER_PREDICCION)
          : null
      }
      slug={params.slug}
      marca={evento.brand}
      mostrarSprite={evento.showVehicle}
      sprite={
        evento.vehicleSprite && {
          url: evento.vehicleSprite.spriteUrl,
          nombre: evento.vehicleSprite.modelName ?? '',
          loopUrl: evento.vehicleSprite.loopUrl,
          posterUrl: evento.vehicleSprite.posterUrl,
          blackBackground: evento.vehicleSprite.blackBackground,
        }
      }
    />
  )
}
