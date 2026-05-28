import { z } from 'zod'

// ─── Shared validators ────────────────────────────────────────────────────────

/** Validates a 6-digit hex color string (e.g. `#003087`). */
export const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #003087)')

// ─── Trivia ───────────────────────────────────────────────────────────────────

// Base object — usable with .partial() for PATCH/PUT routes
export const triviaBaseSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must be at most 120 characters')
    .trim(),

  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(80, 'Slug must be at most 80 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .trim(),

  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .trim()
    .optional()
    .nullable(),

  logoUrl: z.string().url('Must be a valid URL').optional().nullable(),

  companyId: z.string().cuid('Invalid company ID').optional().nullable(),

  brandIds: z.array(z.string().cuid()).default([]),

  // Brand colors
  primaryColor: hexColor.default('#003087'),
  secondaryColor: hexColor.default('#002060'),
  accentColor: hexColor.default('#F97316'),
  backgroundColor: hexColor.default('#F8FAFC'),
  textColor: hexColor.default('#1A1A2E'),

  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  showLeaderboard: z.boolean().default(true),

  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),

  maxPlaysPerUser: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Must allow at least 1 play')
    .max(100, 'Cannot exceed 100 plays per user')
    .default(1),

  gameInstructions: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  heroImageUrl: z.string().optional().nullable(),
  heroImageSettings: z.object({
    zoom: z.number().default(1),
    x: z.number().default(0),
    y: z.number().default(0),
    height: z.number().default(400),
  }).optional().nullable(),
})

// Full schema with cross-field refinement — use for POST (create)
export const triviaSchema = triviaBaseSchema.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate > data.startDate
    }
    return true
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  },
)

export type TriviaInput = z.infer<typeof triviaSchema>

// ─── Question ─────────────────────────────────────────────────────────────────

export const questionSchema = z.object({
  triviaId: z.string().cuid('Invalid trivia ID').optional(),

  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(500, 'Question must be at most 500 characters')
    .trim(),

  options: z
    .array(
      z
        .string()
        .min(1, 'Option cannot be empty')
        .max(200, 'Option must be at most 200 characters')
        .trim(),
    )
    .min(2, 'At least 2 options are required')
    .max(6, 'No more than 6 options allowed'),

  correctAnswer: z
    .number()
    .int('Correct answer must be a whole number')
    .min(0, 'Correct answer index must be 0 or greater'),

  points: z
    .number()
    .int('Points must be a whole number')
    .min(1, 'Points must be at least 1')
    .max(10_000, 'Points must be at most 10,000')
    .default(100),

  timeLimit: z
    .number()
    .int('Time limit must be a whole number (seconds)')
    .min(5, 'Time limit must be at least 5 seconds')
    .max(300, 'Time limit must be at most 300 seconds')
    .default(30),

  orderIndex: z.number().int().min(0).default(0),
}).refine(
  (data) => data.correctAnswer < data.options.length,
  {
    message: 'Correct answer index must match one of the provided options',
    path: ['correctAnswer'],
  },
)

export type QuestionInput = z.infer<typeof questionSchema>

// ─── FormField ────────────────────────────────────────────────────────────────

const FIELD_TYPES = ['text', 'email', 'phone', 'select', 'number', 'brand_models'] as const

export const formFieldSchema = z.object({
  triviaId: z.string().cuid('Invalid trivia ID').optional(),

  fieldName: z
    .string()
    .min(1, 'Field name is required')
    .max(50, 'Field name must be at most 50 characters')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      'Field name must start with a letter and contain only letters, numbers, and underscores',
    )
    .trim(),

  fieldLabel: z
    .string()
    .min(1, 'Field label is required')
    .max(100, 'Field label must be at most 100 characters')
    .trim(),

  fieldType: z.enum(FIELD_TYPES, {
    error: `Field type must be one of: ${FIELD_TYPES.join(', ')}`,
  }),

  isRequired: z.boolean().default(true),

  /** Options are only relevant for `select` type fields. */
  options: z
    .array(z.string().min(1).max(200).trim())
    .optional()
    .nullable(),

  placeholder: z.string().max(200).trim().optional().nullable(),

  orderIndex: z.number().int().min(0).default(0),
})

export type FormFieldInput = z.infer<typeof formFieldSchema>
