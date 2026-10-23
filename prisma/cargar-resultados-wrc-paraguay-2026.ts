// Author: Angel Colman
/**
 * Carga los resultados oficiales del Ueno Rally del Paraguay 2026 y repuntúa
 * las predicciones.
 *
 * Usa el mismo `resolveMarket` que el panel, así que valida igual, deja la
 * misma trazabilidad y se puede correr las veces que haga falta: si la
 * organización revisa un tiempo, se corrige el JSON y se vuelve a correr.
 *
 *   npx tsx prisma/cargar-resultados-wrc-paraguay-2026.ts            # simulacro
 *   npx tsx prisma/cargar-resultados-wrc-paraguay-2026.ts --cargar   # escribe
 *
 * El tramo cancelado (SS21) se saltea siempre: sin resultado no se puede
 * puntuar y sus predicciones quedan sin puntaje.
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveMarket } from '../src/lib/predictions/resolver'
import { eventLeaderboard } from '../src/lib/predictions/resolver'
import { scorePrediction, type MarketConfig, type MarketType } from '../src/lib/predictions/scoring'

const prisma = new PrismaClient()
const SLUG = 'wrc-paraguay-2026'
const CARGAR = process.argv.includes('--cargar')

interface Ganador { numero: string; piloto: string; tiempo: string }

async function main() {
  const raw = readFileSync(join(__dirname, 'seed-data/wrc-paraguay-2026-resultados.json'), 'utf8')
  const datos = JSON.parse(raw) as {
    ganadoresPorTramo: Record<string, Ganador | null>
    podio: Ganador[]
  }

  const event = await prisma.predictionEvent.findUnique({ where: { slug: SLUG } })
  if (!event) throw new Error(`No existe el evento ${SLUG}.`)

  const admin = await prisma.user.findFirst({
    where: { role: 'super_admin', isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!admin) throw new Error('No hay un super_admin activo para firmar la carga.')

  const tripulaciones = await prisma.contender.findMany({
    where: { eventId: event.id },
    select: { id: true, number: true, name: true },
  })
  const porNumero = new Map(tripulaciones.map(c => [c.number, c]))

  const markets = await prisma.market.findMany({
    where: { eventId: event.id },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true, title: true, type: true, config: true,
      segment: { select: { code: true } },
      resolution: { select: { value: true } },
      _count: { select: { predictions: true } },
    },
  })

  /** Resuelve un número de auto a su id de contendiente, o corta. */
  const idDe = (numero: string, contexto: string) => {
    const c = porNumero.get(numero)
    if (!c) throw new Error(`${contexto}: no hay tripulación con el número ${numero} en el evento.`)
    return c
  }

  // ── Qué se va a cargar ────────────────────────────────────────────────────
  const plan: { marketId: string; titulo: string; valor: unknown; etiqueta: string; predicciones: number }[] = []

  for (const m of markets) {
    if (m.segment) {
      const g = datos.ganadoresPorTramo[m.segment.code]
      if (g === undefined) throw new Error(`Falta el resultado del tramo ${m.segment.code} en el JSON.`)
      if (g === null) {
        console.log(`  —  ${m.segment.code.padEnd(5)} tramo cancelado, se saltea (${m._count.predictions} predicciones sin puntuar)`)
        continue
      }
      const c = idDe(g.numero, m.segment.code)
      plan.push({ marketId: m.id, titulo: m.title, valor: c.id,
        etiqueta: `#${g.numero} ${c.name} · ${g.tiempo}`, predicciones: m._count.predictions })
    } else {
      const ids = datos.podio.map((p, i) => idDe(p.numero, `podio ${i + 1}º`))
      plan.push({ marketId: m.id, titulo: m.title, valor: ids.map(c => c.id),
        etiqueta: ids.map((c, i) => `${i + 1}º #${datos.podio[i].numero} ${c.name}`).join('  '),
        predicciones: m._count.predictions })
    }
  }

  console.log(`\n${plan.length} mercados a resolver sobre ${markets.length}.\n`)
  for (const p of plan) {
    console.log(`  ${p.titulo}\n     → ${p.etiqueta}   (${p.predicciones} predicciones)`)
  }

  // ── Simulacro: cuánto puntúa cada mercado sin tocar nada ───────────────────
  if (!CARGAR) {
    console.log('\n── SIMULACRO ── (no se escribió nada; agregá --cargar para hacerlo)\n')
    const puntos = new Map<string, number>()
    let aciertos = 0
    for (const p of plan) {
      const m = markets.find(x => x.id === p.marketId)!
      const preds = await prisma.prediction.findMany({
        where: { marketId: p.marketId },
        select: { playerId: true, value: true },
      })
      let conPuntos = 0
      for (const pr of preds) {
        const pts = scorePrediction(m.type as MarketType, (m.config ?? {}) as MarketConfig, pr.value, p.valor)
        if (pts > 0) conPuntos++
        puntos.set(pr.playerId, (puntos.get(pr.playerId) ?? 0) + pts)
      }
      aciertos += conPuntos
      console.log(`  ${String(conPuntos).padStart(4)} aciertos de ${String(preds.length).padStart(4)}  ${p.titulo}`)
    }
    const orden = Array.from(puntos.entries()).sort((a, b) => b[1] - a[1])
    const jugadores = await prisma.player.findMany({
      where: { id: { in: orden.slice(0, 10).map(([id]) => id) } },
      select: { id: true, fullName: true, email: true },
    })
    const nombre = new Map(jugadores.map(j => [j.id, j]))
    console.log(`\n  Total de aciertos: ${aciertos}`)
    console.log(`  Jugadores con al menos un punto: ${orden.filter(([, v]) => v > 0).length} de ${orden.length}\n`)
    console.log('  Top 10 proyectado:')
    orden.slice(0, 10).forEach(([id, pts], i) => {
      const j = nombre.get(id)
      console.log(`   ${String(i + 1).padStart(2)}. ${String(pts).padStart(5)} pts  ${j?.fullName ?? id} <${j?.email ?? ''}>`)
    })
    return
  }

  // ── Carga real ────────────────────────────────────────────────────────────
  console.log('\n── CARGANDO ──\n')
  for (const p of plan) {
    const r = await resolveMarket(p.marketId, p.valor, admin.id, 'oficial')
    if (!r.ok) throw new Error(`${p.titulo}: ${r.error}`)
    console.log(`  ${r.revision ? 'corregido' : 'cargado  '}  ${String(r.puntuadas).padStart(4)} puntuadas  ${p.titulo}`)
  }

  const tabla = await eventLeaderboard(event.id, 10)
  console.log('\n  Top 10:')
  tabla.forEach((f, i) =>
    console.log(`   ${String(i + 1).padStart(2)}. ${String(f.puntos).padStart(5)} pts  ${f.nombre} <${f.email}>  (${f.acertadas}/${f.cargadas})`),
  )
  console.log('\nListo. El estado del evento no se tocó: cambialo a "settled" desde el panel cuando corresponda.')
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
