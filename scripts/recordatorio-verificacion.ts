// Author: Angel Colman
/**
 * Recordatorio de verificación para quienes jugaron un evento y nunca
 * confirmaron el correo.
 *
 * POR DEFECTO NO ENVÍA NADA: lista a quiénes alcanzaría y corta. Para enviar
 * de verdad hay que pasar --enviar de forma explícita, porque esto le escribe
 * a jugadores reales y no hay manera de deshacerlo.
 *
 *   npx tsx scripts/recordatorio-verificacion.ts <eventId>
 *   npx tsx scripts/recordatorio-verificacion.ts <eventId> --solo=vos@ejemplo.com --enviar
 *   npx tsx scripts/recordatorio-verificacion.ts <eventId> --enviar
 *
 * Opciones:
 *   --enviar        Manda los correos. Sin esto es solo un informe.
 *   --limite=N      Corta en N jugadores (útil para una tanda chica).
 *   --solo=CORREO   Le escribe únicamente a esa dirección, para probar. Si el
 *                   correo es de un jugador pendiente, va el recordatorio real
 *                   con su enlace; si no, va una muestra con un enlace inerte.
 */
import { PrismaClient } from '@prisma/client'
import { issueToken, appUrl } from '../src/lib/player-tokens'
import { sendEmail, verificationReminderEmail } from '../src/lib/email'

const prisma = new PrismaClient()

/** Pausa entre envíos, para no golpear el SMTP de Automotor de una. */
const PAUSA_MS = 1_000

/**
 * Un destinatario ya resuelto. `playerId` en null es una muestra: no hay a
 * quién emitirle un token, así que el enlace va inerte.
 */
interface Destinatario {
  email: string
  fullName: string
  playerId: string | null
}

function arg(nombre: string): string | undefined {
  return process.argv.find(a => a.startsWith(`--${nombre}=`))?.split('=')[1]
}

const USO =
  'npx tsx scripts/recordatorio-verificacion.ts <eventId> [--enviar] [--limite=N] [--solo=CORREO]'

async function main() {
  const eventId = process.argv[2]
  const enviar = process.argv.includes('--enviar')
  const limite = Number(arg('limite') ?? 0) || undefined
  const solo = arg('solo')?.trim().toLowerCase()

  if (!eventId || eventId.startsWith('--')) {
    console.error(`Falta el id del evento.\n  ${USO}`)
    process.exit(1)
  }

  if (solo !== undefined && !solo.includes('@')) {
    console.error(`--solo necesita una dirección de correo.\n  ${USO}`)
    process.exit(1)
  }

  const evento = await prisma.predictionEvent.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  })

  if (!evento) {
    console.error(`No existe un evento con id ${eventId}.`)
    process.exit(1)
  }

  console.log(`Evento: ${evento.title}`)

  let destinatarios: Destinatario[]
  let esMuestra = false

  if (solo) {
    // Modo prueba: una sola dirección. Buscamos si además es un jugador
    // pendiente de este evento; de eso depende que el enlace sirva o no.
    const player = await prisma.player.findUnique({
      where: { email: solo },
      select: {
        id: true, email: true, fullName: true, emailVerifiedAt: true, isActive: true,
        _count: { select: { predictions: { where: { market: { eventId: evento.id } } } } },
      },
    })

    const esPendienteDelEvento =
      player != null &&
      player.isActive &&
      player.emailVerifiedAt == null &&
      player._count.predictions > 0

    esMuestra = !esPendienteDelEvento

    destinatarios = [{
      email: player?.email ?? solo,
      fullName: player?.fullName ?? 'Jugador de prueba',
      playerId: esPendienteDelEvento ? player!.id : null,
    }]

    console.log(`Modo prueba: solo ${destinatarios[0].email}`)
    if (esMuestra) {
      const motivo = !player
        ? 'no hay una cuenta con ese correo'
        : player.emailVerifiedAt
          ? 'esa cuenta ya tiene el correo confirmado'
          : player._count.predictions === 0
            ? 'esa cuenta no jugó este evento'
            : 'esa cuenta está inactiva'
      console.log(`Va una MUESTRA (${motivo}): el enlace no confirma ninguna cuenta.`)
    } else {
      console.log('Va el recordatorio REAL: el enlace confirma esa cuenta.')
    }
  } else {
    const pendientes = await prisma.player.findMany({
      where: {
        emailVerifiedAt: null,
        isActive: true,
        predictions: { some: { market: { eventId: evento.id } } },
      },
      select: { id: true, email: true, fullName: true },
      orderBy: { createdAt: 'asc' },
      take: limite,
    })

    destinatarios = pendientes.map(p => ({ ...p, playerId: p.id }))
    console.log(`Jugaron y no confirmaron el correo: ${destinatarios.length}`)
  }

  if (!enviar) {
    console.log('\nSIMULACIÓN: no se envió ningún correo.')
    console.log(solo ? 'Destinatario:' : 'Primeros 10 destinatarios:')
    for (const d of destinatarios.slice(0, 10)) {
      console.log(`  - ${d.fullName} <${d.email}>`)
    }
    console.log('\nPara enviar de verdad, repetí el comando con --enviar')
    return
  }

  console.log('\nEnviando…')
  let enviados = 0
  let fallados = 0

  for (const d of destinatarios) {
    // Un token nuevo por jugador: el del registro puede estar vencido o usado.
    // En una muestra no emitimos nada — no hay cuenta que confirmar.
    const url = d.playerId
      ? appUrl(`/cuenta/verificar?token=${await issueToken(d.playerId, 'email_verification')}`)
      : appUrl('/cuenta/verificar?token=muestra-sin-validez')

    const { sent, reason } = await sendEmail({
      to: d.email,
      ...verificationReminderEmail(d.fullName, url, evento.title),
    })

    if (sent) {
      enviados++
    } else {
      fallados++
      console.warn(`  falló ${d.email}: ${reason ?? 'desconocido'}`)
    }

    await new Promise(r => setTimeout(r, PAUSA_MS))
  }

  console.log(`\nEnviados: ${enviados} · Fallados: ${fallados}`)
  if (esMuestra) {
    console.log('Era una muestra: el enlace del correo dirá que no es válido. Es lo esperado.')
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
