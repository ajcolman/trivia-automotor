// Author: Angel Colman
/**
 * Envío de correo transaccional por SendGrid.
 *
 * Usa la API HTTP directamente en lugar del SDK: es una sola llamada y evita
 * sumar una dependencia que después hay que mantener.
 *
 * Variables de entorno:
 *   SENDGRID_API_KEY  clave de la cuenta de SendGrid
 *   MAIL_FROM         remitente verificado (ej. no-responder@automotor.com.py)
 *   MAIL_FROM_NAME    nombre visible del remitente
 *
 * Sin `SENDGRID_API_KEY` no falla: registra el correo en consola y sigue. Así
 * el registro de jugadores funciona en desarrollo sin credenciales.
 */

const API_URL = 'https://api.sendgrid.com/v3/mail/send'

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

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY
  const from = process.env.MAIL_FROM
  const fromName = process.env.MAIL_FROM_NAME ?? 'Automotor Play'

  if (!apiKey || !from) {
    console.warn(
      `[email] Sin SENDGRID_API_KEY o MAIL_FROM. No se envió a ${msg.to}: "${msg.subject}"`,
    )
    return { sent: false, reason: 'not_configured' }
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: { email: from, name: fromName },
        subject: msg.subject,
        content: [
          { type: 'text/plain', value: msg.text },
          { type: 'text/html', value: msg.html },
        ],
      }),
    })

    if (!res.ok) {
      // No propagamos el cuerpo del error al cliente: puede traer detalles de
      // la cuenta de SendGrid.
      const detalle = await res.text().catch(() => '')
      console.error(`[email] SendGrid respondió ${res.status}: ${detalle.slice(0, 300)}`)
      return { sent: false, reason: `http_${res.status}` }
    }

    return { sent: true }
  } catch (e) {
    console.error('[email] Falló el envío:', e instanceof Error ? e.message : e)
    return { sent: false, reason: 'network' }
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
