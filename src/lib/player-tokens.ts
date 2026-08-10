// Author: Angel Colman
/**
 * Tokens de verificación de correo y recuperación de contraseña.
 *
 * En la base se guarda solo el hash. Si alguien llegara a leer la tabla no
 * puede reconstruir el enlace: el token en claro existe únicamente durante el
 * request que lo genera y viaja en el correo.
 */
import { createHash, randomBytes } from 'crypto'
import type { PlayerTokenType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Vigencia por tipo de token. */
const TTL_MS: Record<PlayerTokenType, number> = {
  email_verification: 24 * 60 * 60 * 1000, // 24 horas
  password_reset: 60 * 60 * 1000, // 1 hora
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Emite un token nuevo e invalida los anteriores del mismo tipo, para que
 * pedir otro enlace deje sin efecto el anterior.
 */
export async function issueToken(
  playerId: string,
  type: PlayerTokenType,
): Promise<string> {
  const token = randomBytes(32).toString('hex')

  await prisma.$transaction([
    prisma.playerToken.updateMany({
      where: { playerId, type, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.playerToken.create({
      data: {
        playerId,
        type,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TTL_MS[type]),
      },
    }),
  ])

  return token
}

export type ConsumeResult =
  | { ok: true; playerId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' }

/**
 * Valida y consume un token. Es de un solo uso: al validarlo queda marcado,
 * así el mismo enlace no sirve dos veces.
 */
export async function consumeToken(
  token: string,
  type: PlayerTokenType,
): Promise<ConsumeResult> {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'invalid' }

  const registro = await prisma.playerToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, playerId: true, type: true, expiresAt: true, usedAt: true },
  })

  if (!registro || registro.type !== type) return { ok: false, reason: 'invalid' }
  if (registro.usedAt) return { ok: false, reason: 'used' }
  if (registro.expiresAt < new Date()) return { ok: false, reason: 'expired' }

  await prisma.playerToken.update({
    where: { id: registro.id },
    data: { usedAt: new Date() },
  })

  return { ok: true, playerId: registro.playerId }
}

/** Base pública del sitio, para armar los enlaces que van por correo. */
export function appUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'https://trivia-automotor.vercel.app'
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
