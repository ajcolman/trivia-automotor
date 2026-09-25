// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'
import { resolveMarket, clearResolution } from '@/lib/predictions/resolver'
import { logAudit } from '@/lib/audit'
import { revalidateLanding } from '@/lib/revalidate'

/** Carga o corrige el resultado de un mercado y repuntúa sus predicciones. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const resultado = await resolveMarket(params.id, body?.value, session.user.id)

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 })
  }

  await logAudit({
    entityType: 'Resolution',
    entityId: params.id,
    entityName: `Resultado cargado · ${resultado.puntuadas} predicciones puntuadas`,
    action: resultado.revision ? 'UPDATE' : 'CREATE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  revalidateLanding()
  return NextResponse.json({
    ok: true,
    puntuadas: resultado.puntuadas,
    revision: resultado.revision,
  })
}

/** Borra el resultado y deja las predicciones sin puntuar. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const despuntuadas = await clearResolution(params.id)

  await logAudit({
    entityType: 'Resolution',
    entityId: params.id,
    entityName: `Resultado borrado · ${despuntuadas} predicciones sin puntuar`,
    action: 'DELETE',
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  })

  revalidateLanding()
  return NextResponse.json({ ok: true, despuntuadas })
}
