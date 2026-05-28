// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, isSuperAdmin } from '@/lib/admin-auth'
import { jsPDF } from 'jspdf'

const NAVY = [0, 48, 135] as const
const ORANGE = [249, 115, 22] as const
const LIGHT_BG = [248, 250, 252] as const
const DARK_TEXT = [26, 26, 46] as const
const MUTED = [100, 116, 139] as const

function setFill(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
}
function setDraw(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2])
}
function setTextColor(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const trivia = await prisma.trivia.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
      leads: { orderBy: { score: 'desc' }, take: 500 },
      gameSessions: { select: { hasCompleted: true } },
      formFields: { select: { fieldName: true, fieldLabel: true }, orderBy: { orderIndex: 'asc' } },
    },
  })
  if (!trivia) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!isSuperAdmin(session.user.role) && trivia.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const leads = trivia.leads
  const totalLeads = leads.length
  const totalStarted = trivia.gameSessions.length
  const totalCompleted = trivia.gameSessions.filter(s => s.hasCompleted).length
  const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0
  const avgScore = totalLeads > 0
    ? Math.round(leads.reduce((s, l) => s + l.score, 0) / totalLeads)
    : 0
  const avgPct = totalLeads > 0
    ? Math.round(leads.reduce((s, l) => s + (l.maxScore > 0 ? (l.score / l.maxScore) * 100 : 0), 0) / totalLeads)
    : 0
  const maxScore = leads[0]?.maxScore ?? 0

  type LeadAnswer = {
    questionId?: string
    chosen?: number
    correct?: boolean
    isCorrect?: boolean
  }

  // Question performance: count answers and correct answers per question
  const qStats: Record<string, { correct: number; total: number }> = {}
  for (const q of trivia.questions) qStats[q.id] = { correct: 0, total: 0 }
  for (const lead of leads) {
    const answers = (lead.answers as LeadAnswer[]) ?? []
    for (const a of answers) {
      const questionId = typeof a.questionId === 'string' ? a.questionId : ''
      if (!questionId || !qStats[questionId]) continue
      qStats[questionId].total++

      // Backward compatibility:
      // - current payload stores `correct`
      // - older payloads may store `isCorrect`
      if (a.correct === true || a.isCorrect === true) {
        qStats[questionId].correct++
      }
    }
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const PW = 210
  const PH = 297
  const ML = 15
  const MR = 15
  const CW = PW - ML - MR

  let y = 0

  // ── Header banner ──────────────────────────────────────────────
  setFill(doc, NAVY)
  doc.rect(0, 0, PW, 42, 'F')

  setFill(doc, ORANGE)
  doc.rect(0, 38, PW, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  setTextColor(doc, [255, 255, 255])
  doc.text('Informe de Rendimiento', ML, 18)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  setTextColor(doc, [200, 210, 230])
  const titleLines = doc.splitTextToSize(trivia.title, CW)
  doc.text(titleLines, ML, 28)

  doc.setFontSize(9)
  setTextColor(doc, [150, 170, 200])
  const generatedAt = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' })
  doc.text(`Generado: ${generatedAt}`, PW - MR, 36, { align: 'right' })

  y = 52

  // ── Stats cards ────────────────────────────────────────────────
  const stats = [
    { label: 'Participantes', value: String(totalLeads) },
    { label: 'Iniciaron', value: String(totalStarted) },
    { label: 'Completaron', value: `${completionRate}%` },
    { label: 'Puntaje prom.', value: `${avgPct}%` },
  ]
  const cardW = (CW - 9) / 4
  stats.forEach((s, i) => {
    const cx = ML + i * (cardW + 3)
    setFill(doc, LIGHT_BG)
    setDraw(doc, [220, 228, 240])
    doc.setLineWidth(0.3)
    doc.roundedRect(cx, y, cardW, 22, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    setTextColor(doc, NAVY)
    doc.text(s.value, cx + cardW / 2, y + 12, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setTextColor(doc, MUTED)
    doc.text(s.label, cx + cardW / 2, y + 18, { align: 'center' })
  })

  y += 30

  // ── Section helper ─────────────────────────────────────────────
  const sectionTitle = (title: string) => {
    setFill(doc, NAVY)
    doc.rect(ML, y, 3, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setTextColor(doc, DARK_TEXT)
    doc.text(title, ML + 6, y + 5)
    y += 11
  }

  // ── Score distribution ─────────────────────────────────────────
  sectionTitle('Distribución de Puntajes')

  const buckets = [
    { label: '90-100%', min: 90, max: 100 },
    { label: '70-89%', min: 70, max: 89 },
    { label: '40-69%', min: 40, max: 69 },
    { label: '0-39%', min: 0, max: 39 },
  ]
  const bucketCounts = buckets.map(b => ({
    ...b,
    count: leads.filter(l => {
      if (!l.maxScore) return false
      const pct = Math.round((l.score / l.maxScore) * 100)
      return pct >= b.min && pct <= b.max
    }).length,
  }))
  const maxCount = Math.max(...bucketCounts.map(b => b.count), 1)
  const barMaxW = CW - 40

  bucketCounts.forEach(b => {
    const barW = (b.count / maxCount) * barMaxW
    const color = b.min >= 90 ? [34, 197, 94] as const
      : b.min >= 70 ? [59, 130, 246] as const
      : b.min >= 40 ? [251, 191, 36] as const
      : [239, 68, 68] as const

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setTextColor(doc, DARK_TEXT)
    doc.text(b.label, ML, y + 4)

    setFill(doc, [235, 240, 250])
    doc.roundedRect(ML + 18, y, barMaxW, 5, 1, 1, 'F')

    if (b.count > 0) {
      setFill(doc, color)
      doc.roundedRect(ML + 18, y, barW, 5, 1, 1, 'F')
    }

    setTextColor(doc, MUTED)
    doc.text(String(b.count), ML + 18 + barMaxW + 3, y + 4)
    y += 9
  })

  y += 4

  // ── Question performance ───────────────────────────────────────
  if (y > PH - 60) {
    doc.addPage()
    y = 20
  }
  sectionTitle('Rendimiento por Pregunta')

  const colW = [8, CW - 42, 18, 16]
  const headers = ['#', 'Pregunta', 'Correctas', '% Éxito']
  const headerY = y
  setFill(doc, NAVY)
  doc.rect(ML, headerY, CW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setTextColor(doc, [255, 255, 255])
  let cx = ML + 2
  headers.forEach((h, i) => {
    doc.text(h, cx, headerY + 5, { align: i >= 2 ? 'right' : 'left', maxWidth: colW[i] })
    cx += colW[i]
  })
  y += 7

  trivia.questions.forEach((q, idx) => {
    if (y > PH - 20) {
      doc.addPage()
      y = 20
    }
    const qs = qStats[q.id]
    const pct = qs.total > 0 ? Math.round((qs.correct / qs.total) * 100) : 0

    setFill(doc, idx % 2 === 0 ? [255, 255, 255] : LIGHT_BG)
    doc.rect(ML, y, CW, 8, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setTextColor(doc, DARK_TEXT)

    let qx = ML + 2
    doc.text(String(idx + 1), qx, y + 5.5)
    qx += colW[0]

    const qText = doc.splitTextToSize(q.question, colW[1] - 2)
    doc.text(qText[0] + (qText.length > 1 ? '...' : ''), qx, y + 5.5, { maxWidth: colW[1] - 2 })
    qx += colW[1]

    doc.text(`${qs.correct}/${qs.total}`, qx + colW[2] - 2, y + 5.5, { align: 'right' })
    qx += colW[2]

    const pctColor: readonly [number, number, number] = pct >= 70 ? [34, 197, 94] : pct >= 40 ? [234, 179, 8] : [239, 68, 68]
    setTextColor(doc, pctColor)
    doc.setFont('helvetica', 'bold')
    doc.text(`${pct}%`, qx + colW[3] - 2, y + 5.5, { align: 'right' })

    y += 8
  })

  y += 6

  // ── Top participants ───────────────────────────────────────────
  if (y > PH - 60) {
    doc.addPage()
    y = 20
  }

  const nameFields = ['nombre', 'name', 'apellido', 'lastName', 'nombre_completo']
  const multiPlay = trivia.maxPlaysPerUser !== 1

  // Group by sessionId to compute play counts
  const sessionMap = new Map<string, { bestScore: number; maxScore: number; playCount: number; formData: Record<string, string> }>()
  for (const lead of leads) {
    const fd = (lead.formData ?? {}) as Record<string, string>
    const existing = sessionMap.get(lead.sessionId)
    if (!existing) {
      sessionMap.set(lead.sessionId, { bestScore: lead.score, maxScore: lead.maxScore, playCount: 1, formData: fd })
    } else {
      existing.playCount++
      if (lead.score > existing.bestScore) {
        existing.bestScore = lead.score
        existing.maxScore = lead.maxScore
        existing.formData = fd
      }
    }
  }
  const groupedLeads = Array.from(sessionMap.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 10)

  sectionTitle('Top 10 Participantes')

  const topColW = multiPlay ? [8, CW - 54, 18, 12, 16] : [8, CW - 42, 18, 16]
  const topHeaders = multiPlay ? ['#', 'Nombre', 'Mejor puntaje', 'Veces', '%'] : ['#', 'Nombre', 'Puntaje', '%']
  setFill(doc, NAVY)
  doc.rect(ML, y, CW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setTextColor(doc, [255, 255, 255])
  cx = ML + 2
  topHeaders.forEach((h, i) => {
    doc.text(h, cx, y + 5, { align: i >= 2 ? 'right' : 'left' })
    cx += topColW[i]
  })
  y += 7

  groupedLeads.forEach((entry, idx) => {
    if (y > PH - 15) {
      doc.addPage()
      y = 20
    }
    const nameParts = nameFields.map(k => entry.formData[k] ?? '').filter(Boolean)
    const name = nameParts.slice(0, 2).join(' ').trim() || entry.formData[Object.keys(entry.formData)[0]] || 'N/A'
    const pct = entry.maxScore > 0 ? Math.round((entry.bestScore / entry.maxScore) * 100) : 0

    setFill(doc, idx % 2 === 0 ? [255, 255, 255] : LIGHT_BG)
    doc.rect(ML, y, CW, 7, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setTextColor(doc, DARK_TEXT)

    cx = ML + 2
    doc.text(String(idx + 1), cx, y + 5)
    cx += topColW[0]
    doc.text(name.slice(0, 35), cx, y + 5)
    cx += topColW[1]
    doc.text(`${entry.bestScore}/${entry.maxScore}`, cx + topColW[2] - 2, y + 5, { align: 'right' })
    cx += topColW[2]
    if (multiPlay) {
      setTextColor(doc, NAVY)
      doc.setFont('helvetica', 'bold')
      doc.text(String(entry.playCount), cx + topColW[3] - 2, y + 5, { align: 'right' })
      cx += topColW[3]
    }
    setTextColor(doc, pct >= 70 ? [34, 197, 94] : pct >= 40 ? [234, 179, 8] : [239, 68, 68])
    doc.setFont('helvetica', 'bold')
    doc.text(`${pct}%`, cx + topColW[topColW.length - 1] - 2, y + 5, { align: 'right' })
    y += 7
  })

  // ── Footer ─────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    setFill(doc, [235, 240, 250])
    doc.rect(0, PH - 10, PW, 10, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    setTextColor(doc, MUTED)
    doc.text('Automotor Trivia Platform', ML, PH - 4)
    doc.text(`Página ${p} / ${totalPages}`, PW - MR, PH - 4, { align: 'right' })
  }

  const buffer = Buffer.from(doc.output('arraybuffer'))
  const filename = encodeURIComponent(`${trivia.title} - Informe.pdf`)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${filename}`,
    },
  })
}
