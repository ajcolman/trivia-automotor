import { z } from 'zod'

// ─── Shared rules ─────────────────────────────────────────────────────────────

const emailField = z
  .string()
  .email('Debe ser un email válido')
  .max(254, 'El email no puede superar los 254 caracteres')
  .toLowerCase()
  .trim()

const passwordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar los 72 caracteres')
  .refine((p) => /[A-Z]/.test(p), 'Debe contener al menos una letra mayúscula')
  .refine((p) => /[a-z]/.test(p), 'Debe contener al menos una letra minúscula')
  .refine((p) => /[0-9]/.test(p), 'Debe contener al menos un número')
  .refine((p) => /[^A-Za-z0-9]/.test(p), 'Debe contener al menos un carácter especial')

// Empty string → null so optional company select works correctly
const companyIdField = z.preprocess(
  (v) => (v === '' ? null : v),
  z.string().cuid('ID de empresa inválido').optional().nullable(),
)

const USER_ROLES = ['super_admin', 'admin'] as const

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'La contraseña es requerida').max(72),
})

export type LoginInput = z.infer<typeof loginSchema>

export const createUserSchema = z.object({
  email: emailField,

  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .trim(),

  password: passwordField,

  role: z.enum(USER_ROLES).default('admin'),

  companyId: companyIdField,
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  email: emailField.optional(),

  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .trim()
    .optional(),

  password: z.preprocess((v) => (v === '' ? undefined : v), passwordField.optional()),

  role: z.enum(USER_ROLES).optional(),

  companyId: companyIdField,

  isActive: z.boolean().optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
