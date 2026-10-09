// Author: Angel Colman
/**
 * Carga los tramos del LI Rally Transchaco 2026 en el módulo de predicciones.
 *
 * Fuente: "ITINERARIO TCR V3". Se usa ese y no el mapa del banner porque sus
 * sumas cierran exactas (505,30 km de PE) y porque da el dato por tramo, no
 * agrupado. El banner publica los mismos tramos 7 minutos más tarde en las
 * etapas 1 y 2, y 10 minutos más tarde en la 3; como el horario acá es el que
 * cierra las predicciones, se toma el más temprano de los dos.
 *
 * Los horarios son "Paso 1er auto", en hora de Asunción.
 *
 * Idempotente: se puede correr de nuevo sin duplicar nada.
 *
 *   npx tsx prisma/seed-transchaco-2026.ts
 */
import { PrismaClient } from '@prisma/client'
import { CONFIG_POR_DEFECTO } from '../src/lib/predictions/market-config'

const prisma = new PrismaClient()

const SLUG = 'transchaco-rally-2026'

interface Tramo {
  code: string
  name: string
  km: number
  /** Fecha y hora de largada del primer auto, hora de Asunción. */
  largada: string
  /** Etiqueta de la jornada, solo para el resumen que imprime el script. */
  jornada: string
}

const TRAMOS: Tramo[] = [
  // ── Prueba de clasificación · domingo 25 de octubre ──────────────────────
  { code: 'PSE1A', name: 'Autódromo Rubén Dumot (clasificación 1)', km: 4.90, largada: '2026-10-25T10:00:00-03:00', jornada: 'Clasificación' },
  { code: 'PSE1B', name: 'Autódromo Rubén Dumot (clasificación 2)', km: 4.90, largada: '2026-10-25T12:00:00-03:00', jornada: 'Clasificación' },

  // ── Etapa 1 · viernes 30 de octubre ──────────────────────────────────────
  { code: 'PE2', name: 'Ruta D092 Largada - La Patria', km: 14.86, largada: '2026-10-30T07:23:00-03:00', jornada: 'Etapa 1' },
  { code: 'PE3', name: 'Cemelpa - Ruta D092 Llegada', km: 25.15, largada: '2026-10-30T07:51:00-03:00', jornada: 'Etapa 1' },
  { code: 'PE4', name: 'Picada León Pirú - Misión Santa Rosa', km: 32.80, largada: '2026-10-30T08:24:00-03:00', jornada: 'Etapa 1' },
  { code: 'PE5', name: 'Campo Karen Largada - Llegada', km: 32.84, largada: '2026-10-30T10:07:00-03:00', jornada: 'Etapa 1' },
  { code: 'PE6', name: 'Ruta Transchaco - Picada Histórica', km: 12.55, largada: '2026-10-30T12:00:00-03:00', jornada: 'Etapa 1' },
  { code: 'PE7', name: 'Ocho Cué - Picada Aeropuerto', km: 25.00, largada: '2026-10-30T12:23:00-03:00', jornada: 'Etapa 1' },
  { code: 'PSE8', name: 'Súper Especial Largada - Llegada', km: 6.93, largada: '2026-10-30T14:03:00-03:00', jornada: 'Etapa 1' },

  // ── Etapa 2 · sábado 31 de octubre ───────────────────────────────────────
  { code: 'PE9', name: 'Ruta D092 Largada - La Patria', km: 14.86, largada: '2026-10-31T07:23:00-03:00', jornada: 'Etapa 2' },
  { code: 'PE10', name: 'Cemelpa - Ruta D092 Llegada', km: 25.15, largada: '2026-10-31T07:51:00-03:00', jornada: 'Etapa 2' },
  { code: 'PE11', name: 'Línea Fronteriza - Pozo Indio', km: 63.05, largada: '2026-10-31T09:34:00-03:00', jornada: 'Etapa 2' },
  { code: 'PE12', name: 'Picada 40 - La Verónica', km: 20.42, largada: '2026-10-31T10:47:00-03:00', jornada: 'Etapa 2' },
  { code: 'PE13', name: 'Picada Chucho Largada - Llegada', km: 22.67, largada: '2026-10-31T12:05:00-03:00', jornada: 'Etapa 2' },
  { code: 'PE14', name: 'Aduana Infante Rivarola - Cuartel', km: 10.55, largada: '2026-10-31T12:33:00-03:00', jornada: 'Etapa 2' },
  { code: 'PE15', name: 'Picada León Pirú - Misión Santa Rosa', km: 32.80, largada: '2026-10-31T13:51:00-03:00', jornada: 'Etapa 2' },
  { code: 'PE16', name: 'Campo Karen Largada - Llegada', km: 32.84, largada: '2026-10-31T15:34:00-03:00', jornada: 'Etapa 2' },

  // ── Etapa 3 · domingo 1 de noviembre ─────────────────────────────────────
  { code: 'PE17', name: 'Cañada Elisa - Mcal. Estigarribia Norte', km: 18.65, largada: '2026-11-01T07:50:00-03:00', jornada: 'Etapa 3' },
  { code: 'PE18', name: 'Ruta Transchaco - Picada Histórica', km: 13.00, largada: '2026-11-01T08:18:00-03:00', jornada: 'Etapa 3' },
  { code: 'PE19', name: 'Ocho Cué - Picada Aeropuerto', km: 25.20, largada: '2026-11-01T08:41:00-03:00', jornada: 'Etapa 3' },
  { code: 'PE20', name: 'Ruta Transchaco - Picada Histórica', km: 13.00, largada: '2026-11-01T10:19:00-03:00', jornada: 'Etapa 3' },
  { code: 'PE21', name: 'Ocho Cué - Picada Aeropuerto', km: 25.20, largada: '2026-11-01T10:42:00-03:00', jornada: 'Etapa 3' },
  // El mapa la marca como PWS: es la Power Stage del rally.
  { code: 'PE22', name: 'Granja Intendente - Mcal. Estigarribia Norte (Power Stage)', km: 27.98, largada: '2026-11-01T11:25:00-03:00', jornada: 'Etapa 3' },
]

async function main() {
  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: SLUG },
    select: { id: true, title: true },
  })
  if (!evento) throw new Error(`No existe el juego "${SLUG}"`)

  let tramosNuevos = 0
  let preguntasNuevas = 0

  for (let i = 0; i < TRAMOS.length; i++) {
    const t = TRAMOS[i]
    const largada = new Date(t.largada)

    const datos = {
      name: t.name,
      distanceKm: t.km,
      startsAt: largada,
      // El tramo cierra cuando larga el primer auto.
      locksAt: largada,
      orderIndex: i,
    }

    const existente = await prisma.segment.findUnique({
      where: { eventId_code: { eventId: evento.id, code: t.code } },
      select: { id: true },
    })

    const tramo = existente
      ? await prisma.segment.update({ where: { id: existente.id }, data: datos })
      : await prisma.segment.create({ data: { eventId: evento.id, code: t.code, ...datos } })
    if (!existente) tramosNuevos++

    // Una pregunta de ganador por tramo, como las crea el panel.
    const pregunta = {
      title: `Ganador del ${t.code} · ${t.name}`,
      locksAt: largada,
      orderIndex: i,
      config: CONFIG_POR_DEFECTO.single_pick as object,
    }
    const preguntaExistente = await prisma.market.findFirst({
      where: { eventId: evento.id, segmentId: tramo.id, type: 'single_pick' },
      select: { id: true },
    })
    if (preguntaExistente) {
      await prisma.market.update({ where: { id: preguntaExistente.id }, data: pregunta })
    } else {
      await prisma.market.create({
        data: { eventId: evento.id, segmentId: tramo.id, type: 'single_pick', ...pregunta },
      })
      preguntasNuevas++
    }
  }

  // El juego termina con el último tramo.
  const ultimo = new Date(TRAMOS[TRAMOS.length - 1].largada)
  await prisma.predictionEvent.update({
    where: { id: evento.id },
    data: { closesAt: ultimo },
  })

  const km = TRAMOS.reduce((s, t) => s + t.km, 0)
  console.log(`${evento.title}`)
  console.log(`  tramos: ${TRAMOS.length} (${tramosNuevos} nuevos) · ${km.toFixed(2)} km de PE`)
  console.log(`  preguntas de ganador: ${preguntasNuevas} nuevas`)
  for (const j of ['Clasificación', 'Etapa 1', 'Etapa 2', 'Etapa 3']) {
    const lista = TRAMOS.filter(t => t.jornada === j)
    const primero = new Date(lista[0].largada)
    console.log(
      `  ${j.padEnd(14)} ${String(lista.length).padStart(2)} tramos · ` +
      `primera largada ${primero.toLocaleString('es-PY', { timeZone: 'America/Asuncion' })}`,
    )
  }
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
