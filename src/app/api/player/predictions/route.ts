// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { isValidPrediction, type MarketConfig, type MarketType } from '@/lib/predictions/scoring'
import { validarElegibles } from '@/lib/predictions/elegibilidad'

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 })

/**
 * Guarda o actualiza la predicción de un jugador para un mercado.
 *
 * El cierre se valida acá, contra el reloj del servidor. La pantalla también
 * lo muestra, pero esa comprobación es solo para la interfaz: la que cuenta es
 * esta, porque el cliente puede mentir sobre la hora.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'player') {
    return NextResponse.json({ error: 'Iniciá sesión para jugar.' }, { status: 401 })
  }

  if (limiter.check(session.user.id)) {
    return NextResponse.json({ error: 'Demasiados cambios seguidos. Esperá un momento.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const marketId = typeof body?.marketId === 'string' ? body.marketId : ''
  const value = body?.value

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: {
      id: true,
      type: true,
      config: true,
      locksAt: true,
      eventId: true,
      segment: { select: { isCancelled: true, code: true } },
      event: { select: { status: true } },
    },
  })

  if (!market) {
    return NextResponse.json({ error: 'No encontramos esa pregunta.' }, { status: 404 })
  }

  if (market.event.status !== 'open' && market.event.status !== 'live') {
    return NextResponse.json(
      { error: 'El juego todavía no está abierto.' },
      { status: 409 },
    )
  }

  if (market.segment?.isCancelled) {
    return NextResponse.json(
      { error: `El ${market.segment.code} fue cancelado por la organización.`, cerrado: true },
      { status: 409 },
    )
  }

  if (new Date() >= market.locksAt) {
    return NextResponse.json(
      { error: 'Esta predicción ya cerró.', cerrado: true },
      { status: 409 },
    )
  }

  const config = (market.config ?? {}) as MarketConfig
  if (!isValidPrediction(market.type as MarketType, config, value)) {
    return NextResponse.json({ error: 'La elección no es válida.' }, { status: 400 })
  }

  // `isValidPrediction` solo mira la forma: para un `single_pick` cualquier
  // texto la cumple. Que lo elegido exista, sea de este juego y largue esta
  // pregunta se comprueba acá, porque el cliente manda el id que quiera.
  const elegibilidad = await validarElegibles(market.id, market.eventId, value, true)
  if (!elegibilidad.ok) {
    return NextResponse.json({ error: elegibilidad.error }, { status: 400 })
  }

  const prediction = await prisma.prediction.upsert({
    where: { marketId_playerId: { marketId: market.id, playerId: session.user.id } },
    update: { value },
    create: { marketId: market.id, playerId: session.user.id, value },
    select: { id: true, value: true, updatedAt: true },
  })

  return NextResponse.json({ ok: true, prediction })
}
