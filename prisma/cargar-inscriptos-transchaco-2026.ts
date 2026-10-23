// Author: Angel Colman
/**
 * Carga la lista de inscriptos del Transchaco Rally 2026 y saca el aviso de
 * "próximamente" de la descripción del juego.
 *
 * Fuente: "Lista de Inscriptos – FINAL" del 22 de octubre de 2026, firmada por
 * la organización. 86 tripulaciones: 61 autos, 7 camionetas y 18 históricos.
 *
 * Dos cosas que conviene saber al leer los datos:
 *
 * 1. No todas largan las etapas. Quince tripulaciones corren solamente la
 *    PSE1a y la PSE1b, así que no pueden ganar ningún otro tramo. La
 *    plataforma no tiene elegibilidad por tramo, así que el aviso va al
 *    principio de la línea de categoría -- la lista recorta y eso es lo que
 *    más le importa a quien está eligiendo.
 *
 * 2. Camionetas e históricos compiten en su propia clasificación. Van con el
 *    rótulo adelante por el mismo motivo.
 *
 * El PDF se contradice en los históricos: las filas dicen 14 completas y 4 de
 * sola clasificación, y el pie de esa página dice 15 y 3. Se toman las filas,
 * que son el dato por tripulación.
 *
 * Idempotente: se puede correr de nuevo sin duplicar nada.
 *
 *   npx tsx prisma/cargar-inscriptos-transchaco-2026.ts
 */
import { PrismaClient } from '@prisma/client'
import inscriptos from './seed-data/transchaco-2026-inscriptos.json'
import { SLUG, DIVISIONES } from './transchaco-2026'

const prisma = new PrismaClient()

/** El aviso que ya no corresponde: las predicciones están abiertas. */
const AVISO = /\n?PRÓXIMAMENTE DISPONIBLE PARA REALIZAR PREDICCIONES\.?/i

async function main() {
  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: SLUG },
    select: { id: true, title: true, description: true },
  })
  if (!evento) throw new Error(`No existe el juego "${SLUG}"`)

  const delJuego = (seccion: string) => (DIVISIONES as readonly string[]).includes(seccion)

  let nuevas = 0
  for (const c of inscriptos) {
    const datos = {
      name: c.name,
      subtitle: c.subtitle,
      teamName: c.teamName,
      category: c.category,
      orderIndex: c.orderIndex,
      // Se cargan las 86 de la lista oficial, pero solo quedan activas las
      // divisiones sobre las que pregunta el juego. Ver `./transchaco-2026`.
      isActive: delJuego(c.seccion),
    }
    const existente = await prisma.contender.findUnique({
      where: { eventId_number: { eventId: evento.id, number: c.number } },
      select: { id: true },
    })
    if (existente) {
      await prisma.contender.update({ where: { id: existente.id }, data: datos })
    } else {
      await prisma.contender.create({ data: { eventId: evento.id, number: c.number, ...datos } })
      nuevas++
    }
  }

  // Si quedó alguna tripulación de una carga anterior que ya no está en la
  // lista final, se desactiva en vez de borrarse: las predicciones guardan el
  // id del elegido y borrarlo dejaría elecciones huérfanas.
  const numeros = inscriptos.map(c => c.number)
  const { count: retiradas } = await prisma.contender.updateMany({
    where: { eventId: evento.id, isActive: true, number: { notIn: numeros } },
    data: { isActive: false },
  })

  const descripcion = evento.description?.replace(AVISO, '').trim() || null
  if (descripcion !== evento.description) {
    await prisma.predictionEvent.update({
      where: { id: evento.id },
      data: { description: descripcion },
    })
  }

  console.log(evento.title)
  console.log(`  tripulaciones: ${inscriptos.length} (${nuevas} nuevas)`)
  if (retiradas) console.log(`  desactivadas por no estar en la lista final: ${retiradas}`)
  const activos = inscriptos.filter(c => delJuego(c.seccion))
  const largan = activos.filter(c => c.largaEtapas).length
  console.log(`  del juego (${DIVISIONES.join(', ')}): ${activos.length} · fuera del juego: ${inscriptos.length - activos.length}`)
  console.log(`  largan las etapas: ${largan} · solo la clasificación: ${activos.length - largan}`)
  console.log(`  descripción: ${descripcion !== evento.description ? 'aviso de próximamente retirado' : 'sin cambios'}`)
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
