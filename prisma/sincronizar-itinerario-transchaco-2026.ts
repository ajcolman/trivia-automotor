// Author: Angel Colman
/**
 * Pone los horarios de los tramos al día con el itinerario oficial.
 *
 * La organización reprograma tramos durante el fin de semana de carrera y
 * publica un itinerario nuevo en el canal. Si el cierre de una pregunta queda
 * más tarde que la largada real, se puede apostar sabiendo cómo viene el
 * tramo, así que esto existe para corregirlo rápido y sin tocar la base a mano.
 *
 * La tabla de abajo es la fuente de verdad: lo que no coincide se corrige, lo
 * que ya coincide no se toca. Al reprogramarse un tramo se actualiza acá y se
 * vuelve a correr.
 *
 * Uso:
 *   npx tsx prisma/sincronizar-itinerario-transchaco-2026.ts            (simulacro)
 *   npx tsx prisma/sincronizar-itinerario-transchaco-2026.ts --cargar   (escribe)
 */
import { PrismaClient } from '@prisma/client'
import { logAudit } from '../src/lib/audit'
import { SLUG } from './transchaco-2026'

const prisma = new PrismaClient()
const CARGAR = process.argv.includes('--cargar')

/** Paraguay usa UTC-03:00 todo el año desde 2024. */
const OFFSET = '-03:00'

/**
 * Paso del primer auto, según `tcr 2026 v5.pdf` del canal oficial.
 *
 * Es la hora de largada del tramo y también el cierre de su pregunta: en el
 * panel el cierre sigue a la largada salvo que se indique otro a propósito.
 */
const ITINERARIO: Record<string, string> = {
  // Clasificación · domingo 25 de octubre
  PSE1A: '2026-10-25T10:00',
  PSE1B: '2026-10-25T12:00',
  // Etapa 1 · viernes 30 de octubre
  PE2: '2026-10-30T07:30',
  PE3: '2026-10-30T07:58',
  PE4: '2026-10-30T08:41',
  PE5: '2026-10-30T10:24',
  PE6: '2026-10-30T12:07',
  PE7: '2026-10-30T12:30',
  PSE8: '2026-10-30T14:03',
  // Etapa 2 · sábado 31 de octubre
  PE9: '2026-10-31T07:30',
  PE10: '2026-10-31T07:58',
  PE11: '2026-10-31T09:41',
  PE12: '2026-10-31T10:54',
  PE13: '2026-10-31T11:57',
  PE14: '2026-10-31T12:35',
  PE15: '2026-10-31T13:53',
  PE16: '2026-10-31T15:36',
  // Etapa 3 · domingo 1 de noviembre
  PE17: '2026-11-01T08:00',
  PE18: '2026-11-01T08:28',
  PE19: '2026-11-01T08:51',
  PE20: '2026-11-01T10:29',
  PE21: '2026-11-01T10:52',
  PE22: '2026-11-01T11:35',
}

const f = new Intl.DateTimeFormat('es-PY', {
  timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

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
      id: true, code: true, name: true, startsAt: true, locksAt: true, isCancelled: true,
      markets: { select: { id: true, locksAt: true, _count: { select: { predictions: true } } } },
    },
  })

  console.log(`${evento.title}\n`)

  const ahora = new Date()
  const cambios: { tramo: typeof tramos[number]; nuevo: Date; reabre: boolean }[] = []
  const sobran = tramos.filter(t => !ITINERARIO[t.code]).map(t => t.code)
  const faltan = Object.keys(ITINERARIO).filter(c => !tramos.some(t => t.code === c))

  for (const tramo of tramos) {
    const esperado = ITINERARIO[tramo.code]
    if (!esperado) continue

    const nuevo = new Date(`${esperado}:00${OFFSET}`)
    const corridas = tramo.markets.filter(m => m.locksAt.getTime() !== nuevo.getTime())
    const igual = tramo.locksAt.getTime() === nuevo.getTime()
      && tramo.startsAt?.getTime() === nuevo.getTime()
      && corridas.length === 0

    if (igual) continue

    // Mover un cierre del pasado al futuro reabre la pregunta: el jugador
    // podría elegir sabiendo ya cómo viene el tramo. Se avisa fuerte.
    const reabre = tramo.locksAt <= ahora && nuevo > ahora
    cambios.push({ tramo, nuevo, reabre })
  }

  if (sobran.length) console.log(`tramos en la base que la tabla no menciona: ${sobran.join(', ')}\n`)
  if (faltan.length) console.log(`tramos de la tabla que no están en la base: ${faltan.join(', ')}\n`)

  if (!cambios.length) {
    console.log(`Los ${tramos.length} tramos ya coinciden con el itinerario. Nada que hacer.`)
    return
  }

  console.log(`  tramo    cierre actual    cierre nuevo     preds`)
  for (const { tramo, nuevo, reabre } of cambios) {
    const preds = tramo.markets.reduce((s, m) => s + m._count.predictions, 0)
    const marca = reabre ? '  ← REABRE una pregunta ya cerrada' : tramo.isCancelled ? '  (cancelado)' : ''
    console.log(
      `  ${tramo.code.padEnd(7)}  ${f.format(tramo.locksAt).padEnd(15)}  ${f.format(nuevo).padEnd(15)}  ${String(preds).padStart(4)}${marca}`,
    )
  }

  if (!CARGAR) {
    console.log(`\n${cambios.length} tramos por corregir. Simulacro: volvé a correrlo con --cargar para escribir.`)
    return
  }

  const admin = await prisma.user.findFirst({
    where: { role: 'super_admin', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true },
  })
  if (!admin) throw new Error('No hay un super_admin activo para firmar el cambio.')

  for (const { tramo, nuevo } of cambios) {
    // Mismo criterio que el panel: la largada y el cierre van juntos, y el
    // cierre del tramo manda sobre el de sus preguntas.
    await prisma.$transaction([
      prisma.segment.update({
        where: { id: tramo.id },
        data: { startsAt: nuevo, locksAt: nuevo },
      }),
      prisma.market.updateMany({
        where: { segmentId: tramo.id },
        data: { locksAt: nuevo },
      }),
    ])

    await logAudit({
      entityType: 'Segment',
      entityId: tramo.id,
      entityName: `${tramo.code} · ${tramo.name} · cierre ${f.format(tramo.locksAt)} → ${f.format(nuevo)} (itinerario oficial v5)`,
      action: 'UPDATE',
      userId: admin.id,
      userName: admin.name,
      userEmail: admin.email,
    })
  }

  console.log(`\n${cambios.length} tramos corregidos, firmado por ${admin.name}.`)
}

main()
  .catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
