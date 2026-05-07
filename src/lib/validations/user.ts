import { z } from 'zod'

// ─── Shared rules ─────────────────────────────────────────────────────────────

const emailField = z
  .string()
  .email('Must be a valid email address')
  .max(254, 'Email must be at most 254 characters')
  .toLowerCase()
  .trim()

/**
 * Password rules:
 * - 8–72 characters (bcrypt truncates at 72 bytes)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((p) => /[A-Z]/.test(p), 'Password must contain at least one uppercase letter')
  .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
  .refine((p) => /[0-9]/.test(p), 'Password must contain at least one number')
  .refine(
    (p) => /[^A-Za-z0-9]/.test(p),
    'Password must contain at least one special character',
  )

const USER_ROLES = ['super_admin', 'admin'] as const

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Validates the sign-in form (email + password). */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required').max(72),
})

export type LoginInput = z.infer<typeof loginSchema>

/** Validates the payload for creating a new admin user. */
export const createUserSchema = z.object({
  email: emailField,

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),

  password: passwordField,

  role: z.enum(USER_ROLES, {
    error: `Role must be one of: ${USER_ROLES.join(', ')}`,
  }).default('admin'),

  companyId: z.string().cuid('Invalid company ID').optional().nullable(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

/**
 * Validates partial updates to a user profile.
 * Password is optional — if provided it must satisfy the full password rules.
 */
export const updateUserSchema = z.object({
  email: emailField.optional(),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim()
    .optional(),

  /** Leave undefined or empty to keep the existing password. */
  password: z.preprocess((v) => (v === '' ? undefined : v), passwordField.optional()),

  role: z.enum(USER_ROLES).optional(),

  companyId: z.string().cuid('Invalid company ID').optional().nullable(),

  isActive: z.boolean().optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
