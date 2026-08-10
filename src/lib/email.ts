// Author: Angel Colman
/**
 * Envío de correo transaccional por el servidor SMTP de Automotor.
 *
 * Variables de entorno:
 *   MAIL_SERVER     host SMTP (mail.automotor.com.py)
 *   MAIL_PORT       puerto (465 con SSL directo, 587 con STARTTLS)
 *   MAIL_USERNAME   usuario de la casilla
 *   MAIL_PASSWORD   contraseña de la casilla
 *   MAIL_FROM       dirección remitente
 *   MAIL_FROM_NAME  nombre visible del remitente
 *
 * Sin credenciales no falla: registra el correo en consola y sigue, así el
 * registro de jugadores funciona en desarrollo sin configurar nada.
 */
import nodemailer, { type Transporter } from 'nodemailer'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export interface EmailResult {
  sent: boolean
  reason?: string
}

let transporter: Transporter | null = null

/**
 * Transporte reutilizado entre invocaciones. Con Fluid Compute la instancia
 * se reaprovecha, así que mantener el pool abierto evita renegociar TLS en
 * cada correo.
 */
function getTransporter(): Transporter | null {
  const host = process.env.MAIL_SERVER
  const user = process.env.MAIL_USERNAME
  const pass = process.env.MAIL_PASSWORD
  if (!host || !user || !pass) return null

  if (!transporter) {
    const port = Number(process.env.MAIL_PORT ?? 465)
    transporter = nodemailer.createTransport({
      host,
      port,
      // 465 abre la conexión ya cifrada; 587 arranca en claro y sube con STARTTLS.
      secure: port === 465,
      auth: { user, pass },
      pool: true,
      maxConnections: 3,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    })
  }
  return transporter
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const t = getTransporter()
  const from = process.env.MAIL_FROM ?? process.env.MAIL_USERNAME
  const fromName = process.env.MAIL_FROM_NAME ?? 'Automotor Play'

  if (!t || !from) {
    console.warn(
      `[email] Sin credenciales SMTP. No se envió a ${msg.to}: "${msg.subject}"`,
    )
    return { sent: false, reason: 'not_configured' }
  }

  try {
    // Tope duro al tiempo que el correo puede retener un request. Un buzón
    // destino lento no debe hacer esperar a alguien que se está registrando:
    // el envío sigue su curso, pero dejamos de aguardarlo.
    await Promise.race([
      t.sendMail({
        from: { address: from, name: fromName },
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
      new Promise((_, rechazar) =>
        setTimeout(() => rechazar(new Error('timeout')), 10_000),
      ),
    ])
    return { sent: true }
  } catch (e) {
    // El detalle queda en el log del servidor, no viaja al cliente: puede
    // traer información de la casilla.
    console.error('[email] Falló el envío:', e instanceof Error ? e.message : e)
    return { sent: false, reason: 'smtp_error' }
  }
}

/** Plantilla del correo de verificación de cuenta. */
export function verificationEmail(fullName: string, url: string): Omit<EmailMessage, 'to'> {
  const nombre = fullName.split(' ')[0]
  return {
    subject: 'Confirmá tu cuenta de Automotor Play',
    text: `Hola ${nombre},\n\nConfirmá tu cuenta para participar y competir por los premios:\n${url}\n\nEl enlace vence en 24 horas.\n\nSi no creaste esta cuenta, ignorá este mensaje.`,
    html: `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#021F39">
  <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#005CA8;margin:0 0 16px">Automotor Play</p>
  <h1 style="font-size:24px;line-height:1.2;margin:0 0 16px">Confirmá tu cuenta</h1>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px">
    Hola ${nombre}, te falta un paso para participar y competir por los premios.
  </p>
  <p style="margin:0 0 24px">
    <a href="${url}" style="display:inline-block;background:#005CA8;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">
      Confirmar mi cuenta
    </a>
  </p>
  <p style="font-size:14px;color:#4A5E70;line-height:1.6;margin:0 0 8px">
    El enlace vence en 24 horas. Si el botón no funciona, copiá esta dirección:
  </p>
  <p style="font-size:13px;color:#4A5E70;word-break:break-all;margin:0 0 24px">${url}</p>
  <p style="font-size:13px;color:#7C8FA0;border-top:1px solid #D8E3EC;padding-top:16px;margin:0">
    Si no creaste esta cuenta, ignorá este mensaje.
  </p>
</div>`.trim(),
  }
}
