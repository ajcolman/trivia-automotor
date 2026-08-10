// Author: Angel Colman
import { z } from 'zod'

/**
 * Datos que el jugador deja al crear la cuenta. Son obligatorios porque la
 * participación es con premios: hace falta poder identificar y contactar a
 * quien gana.
 */
export const playerRegisterSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Ingresá tu nombre y apellido')
    .max(120, 'El nombre es demasiado largo'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Revisá el correo, no parece válido')
    .max(160),
  phone: z
    .string()
    .trim()
    .min(6, 'Ingresá un teléfono de contacto')
    .max(30, 'El teléfono es demasiado largo'),
  cedula: z
    .string()
    .trim()
    .min(4, 'Ingresá tu número de cédula')
    .max(20, 'La cédula es demasiado larga')
    .regex(/^[0-9.\-]+$/, 'La cédula solo puede tener números, puntos y guiones'),
  password: z
    .string()
    .min(8, 'La contraseña necesita al menos 8 caracteres')
    .max(72, 'La contraseña es demasiado larga'), // límite real de bcrypt
  acceptedTerms: z
    .boolean()
    .refine(v => v === true, 'Tenés que aceptar los términos para participar'),
})

export const playerLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export type PlayerRegisterInput = z.infer<typeof playerRegisterSchema>

/** Deja la cédula solo con dígitos, para comparar sin importar el formato. */
export function normalizeCedula(cedula: string): string {
  return cedula.replace(/[^0-9]/g, '')
}
