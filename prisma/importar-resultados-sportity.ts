// Author: Angel Colman
/**
 * Trae los resultados por tramo del canal oficial del rally en Sportity.
 *
 * El Touring publica los documentos del Transchaco -- itinerarios, boletines y
 * los resultados de cada etapa -- en un canal de Sportity cuya contraseña está
 * publicada en rally.com.py, así que se puede leer sin credenciales nuestras.
 * Los resultados vienen en un PDF llamado "Etapa N - PE x PE" con una fila por
 * tripulación y una columna por prueba especial, y el número de auto coincide
 * con el `number` de nuestras tripulaciones.
 *
 * El ganador de un tramo es el mejor tiempo de esa columna. No se deduce de la
 * clasificación general, que acumula.
 *
 *   # qué documentos de resultados hay en el canal
 *   npx tsx prisma/importar-resultados-sportity.ts
 *
 *   # simulacro: parsea y muestra a quién daría por ganador de cada tramo
 *   npx tsx prisma/importar-resultados-sportity.ts "Etapa 1 - PE x PE"
 *
 *   # escribe los resultados y repuntúa
 *   npx tsx prisma/importar-resultados-sportity.ts "Etapa 1 - PE x PE" --cargar
 *
 *   # probar el formato con otra fecha del campeonato, sin cargar nunca
 *   npx tsx prisma/importar-resultados-sportity.ts "PE x PE" --edicion=Colonias
 *
 * NO carga nada sin `--cargar`, y conviene mirar el simulacro siempre: el PDF
 * numera las pruebas dentro de la etapa ("PE 1", "PE 2"...) mientras nuestro
 * itinerario las numera corridas de punta a punta (PE2..PE22), así que el mapeo
 * se hace por posición y hay que verlo con los ojos antes de escribir.
 *
 * Necesita `pdftotext` (paquete poppler-utils). Es una herramienta de quien
 * administra, para correr a mano después de cada etapa, no algo que corra en
 * el servidor: en rally los tiempos se revisan por penalizaciones y conviene
 * que alguien mire antes de repartir puntos.
 */
import { PrismaClient } from '@prisma/client'
import { execFileSync } from 'child_process'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { resolveMarket } from '../src/lib/predictions/resolver'
import { SLUG } from './transchaco-2026'

const prisma = new PrismaClient()

/** Canal público del Campeonato Nacional de Rally, publicado en rally.com.py. */
const CANAL = 'CNRPY2026'
const VISOR = `https://webapp.sportity.com/channel/${CANAL}`

const CARGAR = process.argv.includes('--cargar')
/**
 * Parsear a propósito otra fecha del campeonato, para probar el formato antes
 * de que publiquen la del Transchaco. Nunca carga: `--cargar` exige el mapeo
 * de tramos, que es del Transchaco.
 */
const OTRA_EDICION = process.argv.find(a => a.startsWith('--edicion='))?.slice('--edicion='.length)
const BUSCADO = process.argv.slice(2).find(a => !a.startsWith('--'))

interface Documento { nombre: string; url: string }

/**
 * Los documentos del canal, con su nombre y su URL en el CDN.
 *
 * El visor web deja la lista entera dentro del HTML, así que no hace falta
 * ejecutar su JavaScript ni usar la API de administración, que pide una clave
 * que tiene la organización y no nosotros.
 */
async function documentos(): Promise<Documento[]> {
  const res = await fetch(VISOR, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`El canal contestó ${res.status}`)
  const html = await res.text()

  const vistos: Documento[] = []
  for (const m of Array.from(html.matchAll(/"(https:\/\/app-cdn\.sportity\.com\/[^"]+)"/g))) {
    const url = m[1].replace(/&amp;/g, '&')
    const archivo = decodeURIComponent(url.slice(url.lastIndexOf('/') + 1))
    // El CDN nombra los archivos `<uuid>_<nombre real>`.
    const nombre = archivo.includes('_') ? archivo.slice(archivo.indexOf('_') + 1) : archivo
    // Los nombres se repiten entre fechas del campeonato: hay tres archivos
    // llamados "Etapa 1 - PE x PE.pdf", uno por rally. No se deduplica por
    // nombre, que es justamente lo que llevaría a cargar la fecha equivocada.
    if (!vistos.some(d => d.url === url)) vistos.push({ nombre, url })
  }
  return vistos
}

/** El PDF como texto, respetando las columnas. */
async function aTexto(doc: Documento): Promise<string> {
  const res = await fetch(encodeURI(doc.url), {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`${doc.nombre}: el CDN contestó ${res.status}`)

  const dir = mkdtempSync(join(tmpdir(), 'sportity-'))
  const pdf = join(dir, 'doc.pdf')
  writeFileSync(pdf, Buffer.from(await res.arrayBuffer()))
  return execFileSync('pdftotext', ['-layout', pdf, '-'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
}

/**
 * Cómo se reconoce que un documento es del Transchaco y no de otra fecha.
 *
 * Esto no es una comodidad, es la guarda que evita cargar los resultados del
 * rally equivocado. El canal es del campeonato entero, así que conviven los
 * documentos de las siete fechas, y los nombres se repiten: hay tres archivos
 * llamados "Etapa 1 - PE x PE.pdf", de Colonias Unidas, Paraguarí y San Pedro.
 * Elegir por nombre de archivo carga la fecha que toque, no la que se quiere.
 *
 * Por eso la edición se lee del encabezado del propio PDF, que trae una línea
 * del tipo "7MA FECHA - Petrobras Transchaco Rally".
 */
const EDICION_TRANSCHACO = /transchaco/i

/** La línea del encabezado que dice de qué fecha del campeonato es. */
function edicionDe(texto: string): string {
  const primeras = texto.split('\n').slice(0, 12).join(' ')
  const fecha = primeras.match(/\d+\s*(?:RA|DA|ER|TA|MA|VA|ª)?\s*FECHA[^\n]{0,60}/i)
  return (fecha?.[0] ?? primeras).replace(/\s+/g, ' ').trim().slice(0, 90)
}

const TIEMPO = /\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2}),(\d{2})\b/g

function aSegundos(m: RegExpMatchArray): number {
  const [, h, min, s, cent] = m
  return Number(h ?? 0) * 3600 + Number(min) * 60 + Number(s) + Number(cent) / 100
}

function reloj(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = (seg % 60).toFixed(2).padStart(5, '0')
  return `${String(m).padStart(2, '0')}:${s}`
}

export interface TramoParseado {
  /** Como lo llama el PDF: "PE 1", "PE 2"... */
  etiqueta: string
  /** Número de auto del mejor tiempo. */
  numero: string
  segundos: number
}

/**
 * Lee la tabla de "PE x PE" y devuelve el mejor tiempo de cada columna.
 *
 * Cada tripulación ocupa dos líneas -- piloto y copiloto -- y los tiempos
 * están en la del piloto, que es la que arranca con el orden y el número. Las
 * dos últimas columnas son el acumulado de la etapa y la diferencia con el
 * primero, así que se descartan.
 */
export function parsearPExPE(texto: string): TramoParseado[] {
  const encabezado = texto.match(/ORD\s+AUTO.*/)
  if (!encabezado) throw new Error('No parece un PDF de "PE x PE": no encontré el encabezado.')

  const etiquetas = encabezado[0].match(/PE\s*\d+/g)?.map(e => e.replace(/\s+/g, ' ')) ?? []
  if (etiquetas.length === 0) throw new Error('El encabezado no declara ninguna PE.')

  const porAuto = new Map<string, number[]>()
  for (const linea of texto.split('\n')) {
    const fila = linea.match(/^\s*(\d+)\s+(\d{1,3})\s+\S/)
    if (!fila) continue
    const tiempos = Array.from(linea.matchAll(TIEMPO)).map(aSegundos)
    // Tiene que haber una columna por PE más el acumulado y la diferencia. Una
    // tripulación que abandonó trae menos y se saltea: no corrió todo.
    if (tiempos.length < etiquetas.length + 2) continue
    if (!porAuto.has(fila[2])) porAuto.set(fila[2], tiempos.slice(0, etiquetas.length))
  }
  if (porAuto.size === 0) throw new Error('No pude leer ninguna fila de tiempos.')

  return etiquetas.map((etiqueta, i) => {
    let mejor: TramoParseado | null = null
    for (const [numero, tiempos] of Array.from(porAuto.entries())) {
      const segundos = tiempos[i]
      if (segundos > 0 && (mejor === null || segundos < mejor.segundos)) {
        mejor = { etiqueta, numero, segundos }
      }
    }
    if (!mejor) throw new Error(`Ninguna tripulación tiene tiempo en ${etiqueta}.`)
    return mejor
  })
}

async function main() {
  const docs = await documentos()

  if (!BUSCADO) {
    const resultados = docs.filter(d => /PE x PE|General|Clases|Final|Tandas/i.test(d.nombre))
    console.log(`Canal ${CANAL} · ${docs.length} documentos, ${resultados.length} con pinta de resultados\n`)
    for (const d of resultados.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
      console.log(`  ${d.nombre}`)
    }
    console.log('\nPasá un nombre (o parte) como argumento para parsearlo.')
    return
  }

  const candidatos = docs.filter(d => d.nombre.toLowerCase().includes(BUSCADO.toLowerCase()))
  if (candidatos.length === 0) throw new Error(`Ningún documento contiene "${BUSCADO}".`)

  // Varios documentos comparten nombre entre fechas, así que se abren todos
  // los candidatos y se elige por la edición que declara cada uno. Son pocos.
  const abiertos: { doc: Documento; texto: string; edicion: string }[] = []
  for (const doc of candidatos) {
    const texto = await aTexto(doc)
    abiertos.push({ doc, texto, edicion: edicionDe(texto) })
  }

  if (candidatos.length > 1) {
    console.log(`"${BUSCADO}" coincide con ${candidatos.length} documentos:`)
    for (const a of abiertos) console.log(`  ${a.doc.nombre}  →  ${a.edicion}`)
    console.log()
  }

  const patron = OTRA_EDICION ? new RegExp(OTRA_EDICION, 'i') : EDICION_TRANSCHACO
  const quetengo = OTRA_EDICION ? `la edición "${OTRA_EDICION}"` : 'el Transchaco'

  const coinciden = abiertos.filter(
    a => patron.test(a.edicion) || patron.test(a.texto.slice(0, 2000)),
  )
  if (coinciden.length === 0) {
    throw new Error(
      `Ninguno de esos documentos es de ${quetengo}. Encontré:\n` +
      abiertos.map(a => `  ${a.edicion}`).join('\n') +
      '\n\nEl canal es del campeonato entero: hay que esperar a que publiquen\n' +
      'el documento de esta fecha, o afinar la búsqueda.',
    )
  }
  if (coinciden.length > 1) {
    throw new Error(
      `Más de un documento de ${quetengo} coincide. Afiná la búsqueda:\n` +
      coinciden.map(a => `  ${a.doc.nombre}  →  ${a.edicion}`).join('\n'),
    )
  }

  const { doc, texto, edicion } = coinciden[0]
  console.log(`${doc.nombre}`)
  console.log(`edición: ${edicion}\n`)

  const tramos = parsearPExPE(texto)

  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: SLUG },
    select: {
      id: true,
      contenders: { select: { id: true, number: true, name: true } },
      markets: {
        where: { segment: { isNot: null } },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true, type: true,
          segment: { select: { code: true, name: true } },
          resolution: { select: { value: true } },
          _count: { select: { predictions: true } },
        },
      },
    },
  })
  if (!evento) throw new Error(`No existe el juego "${SLUG}"`)

  const porNumero = new Map(evento.contenders.map(c => [c.number, c]))

  // El PDF numera las pruebas dentro de la etapa; nuestro itinerario las
  // numera corridas. El mapeo es por posición dentro de la etapa, y por eso
  // hay que mirarlo antes de cargar.
  console.log('  PDF      tramo   ganador')
  const plan: { marketId: string; code: string; contenderId: string; etiqueta: string }[] = []

  for (const t of tramos) {
    const c = porNumero.get(t.numero)
    const quien = c ? `#${t.numero} ${c.name}` : `#${t.numero} (no está en el juego)`
    console.log(`  ${t.etiqueta.padEnd(8)} ${'?'.padEnd(7)} ${quien.padEnd(34)} ${reloj(t.segundos)}`)
    if (c) plan.push({ marketId: '', code: '', contenderId: c.id, etiqueta: t.etiqueta })
  }

  console.log(
    `\nLeídos ${tramos.length} tramos. ` +
    `${plan.length} ganadores están en el juego, ${tramos.length - plan.length} no.`,
  )
  console.log(
    '\nEl mapeo de "PE n" del PDF a los códigos del itinerario se completa cuando\n' +
    'salga el primer documento real del Transchaco: ahí se ve si numera las\n' +
    'pruebas por etapa o corridas, y se declara acá en una línea.',
  )
  if (CARGAR) {
    if (OTRA_EDICION) throw new Error('Con --edicion no se carga nada: es solo para probar el formato.')
    throw new Error('Falta el mapeo de tramos: no se carga nada a ciegas.')
  }
  void resolveMarket
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
