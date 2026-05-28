// Author: Angel Colman
'use client'

export interface CertificateData {
  playerName: string
  triviaTitle: string
  score: number
  maxScore: number
  date: string
  companyName?: string
  logoUrl?: string
}

export async function generateCertificate(data: CertificateData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const W = 297
  const H = 210
  const PRIMARY_BLUE = [0, 48, 135] as const
  const DARK_BLUE = [10, 27, 62] as const
  const MID_BLUE = [0, 82, 204] as const
  const LIGHT_BLUE_BG = [242, 247, 255] as const
  const BORDER_BLUE = [180, 205, 240] as const
  const DARK_TEXT = [26, 26, 46] as const
  const MUTED_TEXT = [71, 85, 105] as const

  // Background gradient simulation
  doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2])
  doc.rect(0, 0, W, 30, 'F')
  doc.setFillColor(LIGHT_BLUE_BG[0], LIGHT_BLUE_BG[1], LIGHT_BLUE_BG[2])
  doc.rect(0, 30, W, H - 30, 'F')

  // Decorative border
  doc.setDrawColor(MID_BLUE[0], MID_BLUE[1], MID_BLUE[2])
  doc.setLineWidth(2)
  doc.rect(8, 8, W - 16, H - 16)
  doc.setDrawColor(BORDER_BLUE[0], BORDER_BLUE[1], BORDER_BLUE[2])
  doc.setLineWidth(0.5)
  doc.rect(10, 10, W - 20, H - 20)

  // Header
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(data.companyName ?? 'Automotor S.A.', W / 2, 20, { align: 'center' })

  // Title
  doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2])
  doc.setFontSize(28)
  doc.text('CERTIFICADO DE PARTICIPACIÓN', W / 2, 55, { align: 'center' })

  // Decorative line
  doc.setDrawColor(MID_BLUE[0], MID_BLUE[1], MID_BLUE[2])
  doc.setLineWidth(1)
  doc.line(60, 60, W - 60, 60)

  // Body text
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.text('Se certifica que', W / 2, 78, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2])
  doc.text(data.playerName, W / 2, 92, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
  doc.text('participó exitosamente en la trivia', W / 2, 106, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2])
  doc.text(`"${data.triviaTitle}"`, W / 2, 120, { align: 'center' })

  // Score
  doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2])
  doc.roundedRect(W / 2 - 40, 128, 80, 20, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const pct = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0
  doc.text(`Puntaje: ${data.score} / ${data.maxScore} (${pct}%)`, W / 2, 141, { align: 'center' })

  // Date
  doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Fecha: ${data.date}`, W / 2, 162, { align: 'center' })

  // Footer
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2])
  doc.setFontSize(9)
  doc.text('Este certificado fue generado automáticamente por la plataforma Automotor Trivia', W / 2, 178, { align: 'center' })
  doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2])
  doc.text('Desarrollado por Angel Colman | © 2025 Automotor S.A.', W / 2, 185, { align: 'center' })

  // Bottom bar in brand blue palette
  doc.setFillColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2])
  doc.rect(0, H - 8, W, 8, 'F')

  doc.save(`certificado-${data.triviaTitle.replace(/\s+/g, '-')}.pdf`)
}
