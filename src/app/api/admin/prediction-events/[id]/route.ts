// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { EventStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { isValidHexColor } from '@/lib/utils'
import { revalidateLanding } from '@/lib/revalidate'

const ESTADOS = Object.values(EventStatus) as string[]

/// Mismos cinco campos que Trivia (ver ColorPicker.tsx): la paridad de
/// paneles pedida por Angel también alinea qué se puede actualizar acá.
const COLOR_KEYS = ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'textColor'] as const
type ColorKey = (typeof COLOR_KEYS)[number]

/// Textos que ve el jugador. `title` y `description` salen en la sala; `rules`
/// es el recuadro que se lee arriba de todo dentro del juego.
const TEXTO_KEYS = ['title', 'description', 'rules'] as const
type TextoKey = (typeof TEXTO_KEYS)[number]

/** Cuánto texto tolera cada campo antes de romper la tarjeta del gabinete. */
const LARGO_MAXIMO: Record<TextoKey, number> = { title: 120, description: 500, rules: 2000 }

/**
 * Actualiza el estado del evento, sus textos, la visibilidad del ranking
 * y/o su paleta de colores.
 * Body: `{ status?, title?, description?, rules?, showLeaderboard?, colors? }`
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })

  const data: Prisma.PredictionEventUpdateInput = {}
  const changeParts: string[] = []

  if ('status' in body) {
    if (typeof body.status !== 'string' || !ESTADOS.includes(body.status)) {
      return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 })
    }
    data.status = body.status as EventStatus
    changeParts.push(`estado → ${body.status}`)
  }

  for (const key of TEXTO_KEYS) {
    if (!(key in body)) continue
    const valor = body[key]
    // `description` y `rules` se vacían mandando null o cadena vacía; el
    // título es lo único que no puede quedar en blanco.
    if (valor !== null && typeof valor !== 'string') {
      return NextResponse.json({ error: `${key} debe ser texto.` }, { status: 400 })
    }
    const limpio = (valor ?? '').trim()
    if (limpio.length > LARGO_MAXIMO[key]) {
      return NextResponse.json(
        { error: `El texto supera los ${LARGO_MAXIMO[key]} caracteres.` },
        { status: 400 },
      )
    }
    if (key === 'title') {
      if (!limpio) return NextResponse.json({ error: 'El título no puede quedar vacío.' }, { status: 400 })
      data.title = limpio
    } else {
      data[key] = limpio || null
    }
    changeParts.push(key === 'title' ? 'título' : key === 'description' ? 'descripción' : 'reglas')
  }

  if ('showLeaderboard' in body) {
    if (typeof body.showLeaderboard !== 'boolean') {
      return NextResponse.json({ error: 'showLeaderboard debe ser booleano.' }, { status: 400 })
    }
    data.showLeaderboard = body.showLeaderboard
    changeParts.push(`ranking ${body.showLeaderboard ? 'visible' : 'oculto'}`)
  }

  if ('colors' in body) {
    const colors = body.colors
    if (typeof colors !== 'object' || colors === null) {
      return NextResponse.json({ error: 'colors debe ser un objeto.' }, { status: 400 })
    }
    for (const key of COLOR_KEYS) {
      const value = (colors as Record<string, unknown>)[key]
      if (value === undefined) continue
      if (typeof value !== 'string' || !isValidHexColor(value)) {
        return NextResponse.json({ error: `${key} no es un color hexadecimal válido.` }, { status: 400 })
      }
      data[key as ColorKey] = value
    }
    if (Object.keys(data).some(k => COLOR_KEYS.includes(k as ColorKey))) {
      changeParts.push('paleta de colores')
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar.' }, { status: 400 })
  }

  const evento = await prisma.predictionEvent.update({
    where: { id: params.id },
    data,
    select: {
      id: true, title: true, status: true, description: true, rules: true, showLeaderboard: true,
      primaryColor: true, secondaryColor: true, accentColor: true, backgroundColor: true, textColor: true,
    },
  })

  // Todo lo que se toca acá -- estado, título, descripción, ranking, colores --
  // se muestra en la sala.
  revalidateLanding()

  await logAudit({
    entityType: 'PredictionEvent',
    entityId: evento.id,
    entityName: `${evento.title} → ${changeParts.join(', ')}`,
    action: 'UPDATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, evento })
}
