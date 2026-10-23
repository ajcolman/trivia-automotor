// Author: Angel Colman
/**
 * Declara quién larga cada tramo del Transchaco Rally 2026.
 *
 * El juego pregunta por los autos -- el porqué está en `./transchaco-2026` --,
 * y dentro de los autos no todos largan todo:
 *
 *   · las dos pruebas de clasificación las largan los 61 autos inscriptos;
 *   · los 21 tramos del Chaco los largan 50, porque once se anotaron
 *     solamente a la clasificación.
 *
 * A una tripulación que no larga el tramo no se le puede ganar, así que
 * elegirla era perder seguro sin que nada lo avisara.
 *
 * Las 23 preguntas quedan declaradas explícitamente, ninguna abierta. La
 * convención de "sin filas en `MarketContender` = todos los del juego" sirve
 * cuando pueden sumarse participantes, y acá no: la lista de inscriptos es la
 * final. Declarado, una camioneta que alguien reactivara por error no se
 * vuelve elegible sola.
 *
 * Idempotente: reescribe la elegibilidad de cada tramo desde cero.
 *
 *   npx tsx prisma/cargar-elegibilidad-transchaco-2026.ts
 */
import { PrismaClient } from '@prisma/client'
import inscriptos from './seed-data/transchaco-2026-inscriptos.json'
import { SLUG, DIVISIONES, CLASIFICACION } from './transchaco-2026'

const prisma = new PrismaClient()

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

  const eventId = evento.id
  const delJuego = inscriptos.filter(c => (DIVISIONES as readonly string[]).includes(c.seccion))

  /** Los ids de la base para una lista de números, o corta si falta alguno. */
  async function idsDe(numeros: string[]) {
    const filas = await prisma.contender.findMany({
      where: { eventId, number: { in: numeros } },
      select: { id: true, number: true },
    })
    if (filas.length !== numeros.length) {
      const faltan = numeros.filter(n => !filas.some(c => c.number === n))
      throw new Error(`Faltan tripulaciones en la base: ${faltan.join(', ')}`)
    }
    return filas.map(c => c.id)
  }

  const enClasificacion = await idsDe(delJuego.map(c => c.number))
  const enEtapas = await idsDe(delJuego.filter(c => c.largaEtapas).map(c => c.number))

  let clasificacion = 0
  let etapas = 0

  for (const m of evento.markets) {
    const code = m.segment?.code
    // Sin tramo no hay a quién preguntarle quién larga: hoy no hay ninguna.
    if (!code) continue

    const esClasificacion = CLASIFICACION.includes(code)
    const ids = esClasificacion ? enClasificacion : enEtapas

    await prisma.$transaction([
      prisma.marketContender.deleteMany({ where: { marketId: m.id } }),
      prisma.marketContender.createMany({
        data: ids.map(contenderId => ({ marketId: m.id, contenderId })),
      }),
    ])
    if (esClasificacion) clasificacion++
    else etapas++
  }

  console.log(evento.title)
  console.log(`  clasificación: ${clasificacion} pruebas · ${enClasificacion.length} tripulaciones cada una`)
  console.log(`  etapas: ${etapas} tramos · ${enEtapas.length} tripulaciones cada uno`)
  console.log(`  filas de elegibilidad: ${clasificacion * enClasificacion.length + etapas * enEtapas.length}`)
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
