// Author: Angel Colman
/**
 * Siembra el Ueno Rally del Paraguay 2026 en el módulo de predicciones.
 *
 * Idempotente: se puede correr las veces que haga falta. Actualiza lo que ya
 * existe en vez de duplicarlo, así se puede reajustar el itinerario si la
 * organización reprograma tramos.
 *
 *   npx tsx prisma/seed-wrc-paraguay-2026.ts
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PUNTAJE_WRC } from '../src/lib/predictions/scoring'

const prisma = new PrismaClient()

interface Tramo {
  code: string
  name: string
  distanceKm: number
  startsAt: string
  leg: string
  liveTv?: boolean
  powerStage?: boolean
}

interface Tripulacion {
  number: number
  driver: string
  coDriver: string
  nat: string
  team: string
  car: string
  class: string
  group: string
}

/**
 * Destacamos a quienes corren en Hyundai: es la marca que vende Automotor.
 * Se deriva del auto y no de una lista fija, así sigue al entry list si cambia.
 */
function esHyundai(c: Tripulacion): boolean {
  return c.car.toLowerCase().includes('hyundai')
}

async function main() {
  const raw = readFileSync(join(__dirname, 'seed-data/wrc-paraguay-2026.json'), 'utf8')
  const data = JSON.parse(raw) as {
    evento: Record<string, any>
    tramos: Tramo[]
    tripulaciones: Tripulacion[]
  }

  const { evento, tramos, tripulaciones } = data
  const primerTramo = new Date(tramos[0].startsAt)

  // ── Evento ────────────────────────────────────────────────────────────────
  const event = await prisma.predictionEvent.upsert({
    where: { slug: evento.slug },
    update: {
      title: evento.title,
      externalRef: evento.externalRef,
      closesAt: new Date(tramos[tramos.length - 1].startsAt),
    },
    create: {
      slug: evento.slug,
      title: evento.title,
      description: `Ronda ${evento.round} del Mundial de Rally. ${evento.cantidadTramos} tramos y ${evento.distanciaCronometradaKm} km cronometrados en ${evento.location}.`,
      externalRef: evento.externalRef,
      status: 'draft',
      closesAt: new Date(tramos[tramos.length - 1].startsAt),
      rules: 'Acertar el ganador de un tramo suma 100 puntos. El podio final exacto suma 500. Cada piloto que termine en el podio pero en una posición distinta a la que elegiste suma 50.',
    },
  })
  console.log(`Evento: ${event.title} (${event.slug})`)

  // ── Tramos ────────────────────────────────────────────────────────────────
  for (let i = 0; i < tramos.length; i++) {
    const t = tramos[i]
    const startsAt = new Date(t.startsAt)
    await prisma.segment.upsert({
      where: { eventId_code: { eventId: event.id, code: t.code } },
      update: { name: t.name, distanceKm: t.distanceKm, startsAt, locksAt: startsAt, orderIndex: i },
      create: {
        eventId: event.id,
        code: t.code,
        name: t.name,
        distanceKm: t.distanceKm,
        startsAt,
        // Cierra cuando larga el primer auto del tramo.
        locksAt: startsAt,
        orderIndex: i,
      },
    })
  }
  console.log(`Tramos: ${tramos.length}`)

  // ── Tripulaciones ─────────────────────────────────────────────────────────
  for (let i = 0; i < tripulaciones.length; i++) {
    const c = tripulaciones[i]
    const num = String(c.number)
    await prisma.contender.upsert({
      where: { eventId_number: { eventId: event.id, number: num } },
      update: {
        name: c.driver,
        subtitle: c.coDriver,
        teamName: c.team,
        category: `${c.class} · ${c.car}`,
        isFeatured: esHyundai(c),
        orderIndex: i,
      },
      create: {
        eventId: event.id,
        number: num,
        name: c.driver,
        subtitle: c.coDriver,
        teamName: c.team,
        category: `${c.class} · ${c.car}`,
        isFeatured: esHyundai(c),
        orderIndex: i,
      },
    })
  }
  console.log(`Tripulaciones: ${tripulaciones.length}`)

  // ── Mercados ──────────────────────────────────────────────────────────────
  // Uno por tramo (ganador) más el podio final a nivel evento.
  const segments = await prisma.segment.findMany({
    where: { eventId: event.id },
    orderBy: { orderIndex: 'asc' },
  })

  let creados = 0
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    const existente = await prisma.market.findFirst({
      where: { eventId: event.id, segmentId: s.id, type: 'single_pick' },
    })
    const payload = {
      title: `Ganador del ${s.code} · ${s.name}`,
      locksAt: s.locksAt,
      config: PUNTAJE_WRC.tramo as object,
      orderIndex: i,
    }
    if (existente) {
      await prisma.market.update({ where: { id: existente.id }, data: payload })
    } else {
      await prisma.market.create({
        data: { eventId: event.id, segmentId: s.id, type: 'single_pick', ...payload },
      })
      creados++
    }
  }

  const podioExistente = await prisma.market.findFirst({
    where: { eventId: event.id, segmentId: null, type: 'ordered_pick' },
  })
  const podio = {
    title: 'Podio final del rally',
    // El podio se cierra cuando larga el primer tramo.
    locksAt: primerTramo,
    config: PUNTAJE_WRC.podio as object,
    orderIndex: 999,
  }
  if (podioExistente) {
    await prisma.market.update({ where: { id: podioExistente.id }, data: podio })
  } else {
    await prisma.market.create({
      data: { eventId: event.id, type: 'ordered_pick', ...podio },
    })
    creados++
  }

  const total = await prisma.market.count({ where: { eventId: event.id } })
  console.log(`Mercados: ${total} (${creados} nuevos)`)
  console.log(`\nPrimer cierre: ${primerTramo.toISOString()} — ${s0(primerTramo)}`)
}

function s0(d: Date) {
  return d.toLocaleString('es-PY', { timeZone: 'America/Asuncion' })
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
