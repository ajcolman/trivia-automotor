// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import * as XLSX from 'xlsx'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const trivia = await prisma.trivia.findUnique({
    where: { id: params.id },
    select: { title: true, createdBy: true, formFields: { select: { fieldName: true, fieldLabel: true }, orderBy: { orderIndex: 'asc' } } },
  })
  if (!trivia) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const leads = await prisma.lead.findMany({
    where: { triviaId: params.id },
    orderBy: { completedAt: 'desc' },
    select: { score: true, maxScore: true, completedAt: true, ipAddress: true, formData: true },
  })

  const fieldMap = Object.fromEntries(trivia.formFields.map(f => [f.fieldName, f.fieldLabel]))

  const rows = leads.map((lead, i) => {
    const form = (lead.formData ?? {}) as Record<string, unknown>
    const row: Record<string, unknown> = {
      '#': i + 1,
      Puntaje: lead.score,
      'Puntaje Máx.': lead.maxScore,
      '%': lead.maxScore > 0 ? `${Math.round((lead.score / lead.maxScore) * 100)}%` : '0%',
      'Fecha y Hora': lead.completedAt.toLocaleString('es-PY', { timeZone: 'America/Asuncion' }),
    }
    // Add form fields in order
    for (const f of trivia.formFields) {
      row[fieldMap[f.fieldName] ?? f.fieldName] = form[f.fieldName] ?? ''
    }
    return row
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 22 },
    ...trivia.formFields.map(() => ({ wch: 24 })),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Participantes')

  const raw = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const uint8 = new Uint8Array(raw)

  const filename = encodeURIComponent(`${trivia.title} - Participantes.xlsx`)
  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
