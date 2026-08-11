// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { EventStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { isValidHexColor } from '@/lib/utils'

const ESTADOS = Object.values(EventStatus) as string[]

/// Mismos cinco campos que Trivia (ver ColorPicker.tsx): la paridad de
/// paneles pedida por Angel también alinea qué se puede actualizar acá.
const COLOR_KEYS = ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'textColor'] as const
type ColorKey = (typeof COLOR_KEYS)[number]

/**
 * Actualiza el estado del evento y/o su paleta de colores.
 * Body: `{ status?: EventStatus, colors?: Partial<Record<ColorKey, string>> }`
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
      id: true, title: true, status: true,
      primaryColor: true, secondaryColor: true, accentColor: true, backgroundColor: true, textColor: true,
    },
  })

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
