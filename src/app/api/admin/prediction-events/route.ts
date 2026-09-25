// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { slugify } from '@/lib/utils'

const nuevoSchema = z.object({
  title: z.string().trim().min(1, 'Poné un título al juego').max(120),
  /** Si no viene, sale del título. Es la URL pública: /predicciones/<slug>. */
  slug: z.string().trim().max(60).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  rules: z.string().trim().max(2000).optional().nullable(),
  /** ISO. Cuándo abre y cuándo termina, solo informativos en la sala. */
  opensAt: z.string().datetime({ offset: true }).optional().nullable(),
  closesAt: z.string().datetime({ offset: true }).optional().nullable(),
})

/**
 * Crea un juego de predicción vacío, siempre en borrador.
 *
 * Nace oculto a propósito: recién cuando tenga tramos, participantes y
 * preguntas cargados tiene sentido pasarlo a "Abierto" y que salga en la sala.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const parsed = nuevoSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' },
      { status: 400 },
    )
  }

  const { title, description, rules, opensAt, closesAt } = parsed.data
  const slug = slugify(parsed.data.slug || title)
  if (!slug) {
    return NextResponse.json(
      { error: 'El título no deja armar una URL. Escribilo con letras o números.' },
      { status: 400 },
    )
  }

  const repetido = await prisma.predictionEvent.findUnique({ where: { slug }, select: { id: true } })
  if (repetido) {
    return NextResponse.json({ error: `Ya hay un juego con la dirección "${slug}".` }, { status: 409 })
  }

  const evento = await prisma.predictionEvent.create({
    data: {
      slug,
      title,
      description: description || null,
      rules: rules || null,
      opensAt: opensAt ? new Date(opensAt) : null,
      closesAt: closesAt ? new Date(closesAt) : null,
      status: 'draft',
    },
    select: { id: true, slug: true, title: true },
  })

  await logAudit({
    entityType: 'PredictionEvent',
    entityId: evento.id,
    entityName: evento.title,
    action: 'CREATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  // No se revalida la sala: nace en borrador y ahí todavía no se muestra.
  return NextResponse.json({ ok: true, evento }, { status: 201 })
}
