// Author: Angel Colman
/**
 * Carga los ganadores de cada tramo del Transchaco 2026.
 *
 * El canal oficial de Sportity publicó los generales acumulados del rally
 * pero no el documento con los tiempos prueba por prueba, que es el que lee
 * `importar-resultados-sportity.ts`. Mientras ese documento no aparezca, los
 * ganadores de tramo salen de la cobertura de ABC, que publicó la lista
 * completa de las 21 especiales que se corrieron.
 *
 * Por qué se puede confiar en esa fuente para esto:
 *
 *  - La general final de ABC coincide dígito por dígito con el PDF oficial
 *    del canal: Weiler a 26,04 y Saba a 5:09,68 del ganador.
 *  - En la clasificación, los tiempos por vuelta de ABC sumados dan exacto
 *    los totales del PDF oficial en los cuatro pilotos que se pudieron
 *    cruzar, y Fau Zaldívar fue el más rápido en las dos vueltas.
 *  - La lista consolidada de ganadores coincide con el minuto a minuto de
 *    cada etapa en los catorce tramos donde hay las dos coberturas.
 *
 * Igual es prensa y no cronometraje oficial, así que el resultado se firma
 * con `source: 'abc'`. Cuando salga el PE x PE del canal, correr el
 * importador: `resolveMarket` sabe revisar un resultado ya cargado y
 * repuntúa, y la revisión queda asentada.
 *
 * Uso:
 *   npx tsx prisma/cargar-resultados-transchaco-2026.ts            (simulacro)
 *   npx tsx prisma/cargar-resultados-transchaco-2026.ts --cargar   (escribe)
 */
import { PrismaClient } from '@prisma/client'
import { resolveMarket } from '../src/lib/predictions/resolver'
import { SLUG } from './transchaco-2026'

const prisma = new PrismaClient()
const CARGAR = process.argv.includes('--cargar')
const FUENTE = 'abc'

/**
 * Ganador de cada tramo, por número de auto.
 *
 * Se fija el número y además el apellido esperado: si alguna vez se recarga
 * la lista de inscriptos y un número cambia de dueño, el control de abajo
 * corta antes de puntuar a la tripulación equivocada.
 *
 * ABC numera la clasificación como una sola "PE1 (Autódromo)". Acá son dos
 * preguntas, una por vuelta, y Fau Zaldívar fue el más rápido en las dos.
 *
 * La PE20 no está: la levantó el director de la prueba por falta de
 * seguridad y el tramo quedó marcado como cancelado.
 */
const GANADORES: Record<string, { numero: string; apellido: string }> = {
  PSE1A: { numero: '19', apellido: 'Fau' },
  PSE1B: { numero: '19', apellido: 'Fau' },
  PE2: { numero: '19', apellido: 'Fau' },
  PE3: { numero: '19', apellido: 'Fau' },
  PE4: { numero: '19', apellido: 'Fau' },
  PE5: { numero: '6', apellido: 'Galanti' },
  PE6: { numero: '6', apellido: 'Galanti' },
  PE7: { numero: '6', apellido: 'Galanti' },
  PSE8: { numero: '6', apellido: 'Galanti' },
  PE9: { numero: '19', apellido: 'Fau' },
  PE10: { numero: '19', apellido: 'Fau' },
  PE11: { numero: '1', apellido: 'Miguel' },
  PE12: { numero: '1', apellido: 'Miguel' },
  PE13: { numero: '42', apellido: 'Weiler' },
  PE14: { numero: '1', apellido: 'Miguel' },
  PE15: { numero: '1', apellido: 'Miguel' },
  PE16: { numero: '6', apellido: 'Galanti' },
  PE17: { numero: '6', apellido: 'Galanti' },
  PE18: { numero: '42', apellido: 'Weiler' },
  PE19: { numero: '42', apellido: 'Weiler' },
  PE21: { numero: '42', apellido: 'Weiler' },
  PE22: { numero: '42', apellido: 'Weiler' },
}

async function main() {
  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: SLUG },
    select: { id: true, title: true },
  })
  if (!evento) throw new Error(`No existe el evento ${SLUG}.`)

  const tramos = await prisma.segment.findMany({
    where: { eventId: evento.id },
    orderBy: { orderIndex: 'asc' },
    select: {
      code: true, isCancelled: true,
      markets: {
        select: {
          id: true,
          resolution: { select: { value: true, source: true } },
          // Una sola basta para saber que quedó algo sin puntuar.
          predictions: { where: { scoredAt: null }, take: 1, select: { id: true } },
          _count: { select: { predictions: true } },
        },
      },
    },
  })

  const autos = await prisma.contender.findMany({
    where: { eventId: evento.id },
    select: { id: true, number: true, name: true, isActive: true },
  })
  const porNumero = new Map(autos.flatMap(c => (c.number ? [[c.number, c] as const] : [])))

  console.log(`${evento.title}\n`)

  // Primero se valida todo y después se escribe: media carga puntuada a
  // medias es peor que ninguna.
  const plan: { code: string; marketId: string; autoId: string; etiqueta: string; preds: number; revision: boolean }[] = []
  const problemas: string[] = []
  const yaEstaban: string[] = []

  for (const [code, esperado] of Object.entries(GANADORES)) {
    const tramo = tramos.find(t => t.code === code)
    if (!tramo) { problemas.push(`${code}: no existe el tramo en la base.`); continue }
    if (tramo.isCancelled) { problemas.push(`${code}: el tramo está cancelado, no se carga.`); continue }
    if (tramo.markets.length !== 1) { problemas.push(`${code}: tiene ${tramo.markets.length} preguntas, esperaba una.`); continue }

    const auto = porNumero.get(esperado.numero)
    if (!auto) { problemas.push(`${code}: no hay ningún auto #${esperado.numero}.`); continue }
    if (!auto.isActive) { problemas.push(`${code}: el #${esperado.numero} (${auto.name}) no está en juego.`); continue }
    if (!auto.name.toLowerCase().includes(esperado.apellido.toLowerCase())) {
      problemas.push(`${code}: el #${esperado.numero} es ${auto.name}, esperaba a ${esperado.apellido}.`)
      continue
    }

    const market = tramo.markets[0]

    // Reanudar no tiene que ensuciar el historial: si este tramo ya quedó
    // cargado con este mismo ganador y esta misma fuente, no se vuelve a
    // resolver, porque `resolveMarket` lo asentaría como una revisión.
    //
    // Pero el resultado y la puntuación se escriben por separado, así que una
    // corrida interrumpida puede dejar el resultado puesto y las predicciones
    // sin puntuar. En ese caso hay que resolver de nuevo, o quedan en cero
    // para siempre.
    const sinPuntuar = market.predictions.length > 0
    if (market.resolution?.value === auto.id && market.resolution.source === FUENTE && !sinPuntuar) {
      yaEstaban.push(code)
      continue
    }

    plan.push({
      code,
      marketId: market.id,
      autoId: auto.id,
      etiqueta: `#${auto.number} ${auto.name}`,
      preds: market._count.predictions,
      revision: market.resolution !== null,
    })
  }

  const sinCargar = tramos.filter(t => !GANADORES[t.code] && !t.isCancelled).map(t => t.code)
  const canceladas = tramos.filter(t => t.isCancelled).map(t => t.code)

  for (const { code, etiqueta, preds, revision } of plan) {
    console.log(`  ${code.padEnd(7)} ${etiqueta.padEnd(32)} ${String(preds).padStart(4)} preds${revision ? '  (ya tenía resultado: se repuntúa)' : ''}`)
  }
  if (yaEstaban.length) console.log(`\nya estaban cargados, se dejan como están: ${yaEstaban.join(', ')}`)
  if (canceladas.length) console.log(`canceladas, no se cargan: ${canceladas.join(', ')}`)
  if (sinCargar.length) console.log(`sin ganador en la tabla: ${sinCargar.join(', ')}`)
  if (problemas.length) {
    console.log(`\nPROBLEMAS:`)
    for (const p of problemas) console.log(`  ${p}`)
    throw new Error('No se cargó nada. Revisá los problemas de arriba.')
  }

  if (!plan.length) {
    console.log(`\nNo hay nada por cargar: los ${yaEstaban.length} tramos con ganador ya están resueltos.`)
    return
  }

  if (!CARGAR) {
    console.log(`\n${plan.length} tramos listos. Simulacro: volvé a correrlo con --cargar para escribir y puntuar.`)
    return
  }

  const admin = await prisma.user.findFirst({
    where: { role: 'super_admin', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })
  if (!admin) throw new Error('No hay un super_admin activo para firmar la carga.')

  let puntuadas = 0
  for (const { code, marketId, autoId } of plan) {
    const r = await resolveMarket(marketId, autoId, admin.id, FUENTE)
    if (!r.ok) throw new Error(`${code}: ${r.error}`)
    puntuadas += r.puntuadas
  }

  console.log(`\n${plan.length} tramos cargados, firmado por ${admin.name}.`)
  console.log(`${puntuadas} predicciones puntuadas. Fuente asentada: ${FUENTE}.`)
}

main()
  .catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
