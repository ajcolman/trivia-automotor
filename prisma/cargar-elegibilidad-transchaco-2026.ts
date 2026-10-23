// Author: Angel Colman
/**
 * Declara quién larga cada tramo del Transchaco Rally 2026.
 *
 * De las 86 tripulaciones inscriptas, 15 están anotadas solamente a las dos
 * pruebas de clasificación (PSE1A y PSE1B). A una que no larga el tramo no se
 * le puede ganar, así que elegirla para cualquier otra pregunta era perder
 * seguro sin que nada lo avisara.
 *
 * Las dos pruebas de clasificación quedan a propósito SIN declarar. Un mercado
 * sin filas en `MarketContender` admite a todos los del juego, y ahí la regla
 * es justamente "todos los inscriptos": si mañana se suma una tripulación,
 * entra sola. En los 21 tramos restantes la regla es otra -- "los que largan
 * las etapas" -- y esa sí hay que escribirla.
 *
 * Idempotente: reescribe la elegibilidad de cada tramo desde cero.
 *
 *   npx tsx prisma/cargar-elegibilidad-transchaco-2026.ts
 */
import { PrismaClient } from '@prisma/client'
import inscriptos from './seed-data/transchaco-2026-inscriptos.json'

const prisma = new PrismaClient()

const SLUG = 'transchaco-rally-2026'

/** Las pruebas de clasificación: las largan todos los inscriptos. */
const CLASIFICACION = ['PSE1A', 'PSE1B']

async function main() {
  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: SLUG },
    select: {
      id: true,
      title: true,
      markets: {
        orderBy: { orderIndex: 'asc' },
        select: { id: true, title: true, segment: { select: { code: true } } },
      },
    },
  })
  if (!evento) throw new Error(`No existe el juego "${SLUG}"`)

  const numeros = inscriptos.filter(c => c.largaEtapas).map(c => c.number)
  const largan = await prisma.contender.findMany({
    where: { eventId: evento.id, number: { in: numeros } },
    select: { id: true, number: true },
  })
  if (largan.length !== numeros.length) {
    const faltan = numeros.filter(n => !largan.some(c => c.number === n))
    throw new Error(`Faltan tripulaciones en la base: ${faltan.join(', ')}`)
  }

  let declarados = 0
  let abiertos = 0

  for (const m of evento.markets) {
    const code = m.segment?.code

    // Sin tramo no hay a quién preguntarle quién larga: se deja abierto.
    if (!code || CLASIFICACION.includes(code)) {
      await prisma.marketContender.deleteMany({ where: { marketId: m.id } })
      abiertos++
      continue
    }

    await prisma.$transaction([
      prisma.marketContender.deleteMany({ where: { marketId: m.id } }),
      prisma.marketContender.createMany({
        data: largan.map(c => ({ marketId: m.id, contenderId: c.id })),
      }),
    ])
    declarados++
  }

  console.log(evento.title)
  console.log(`  tramos con elegibilidad declarada: ${declarados} · ${largan.length} tripulaciones cada uno`)
  console.log(`  tramos abiertos a todos los inscriptos: ${abiertos} (${CLASIFICACION.join(', ')})`)
  console.log(`  filas de elegibilidad: ${declarados * largan.length}`)
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
