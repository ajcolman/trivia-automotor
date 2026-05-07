import { z } from 'zod'

// ─── Individual answer ────────────────────────────────────────────────────────

const clientAnswerSchema = z.object({
  /** CUID of the question being answered */
  questionId: z.string().cuid('Invalid question ID'),

  /** Zero-based index of the chosen option */
  chosen: z
    .number()
    .int('Chosen must be a whole number')
    .min(0, 'Chosen must be a non-negative integer'),

  /** Milliseconds elapsed from question display to answer selection */
  timeMs: z
    .number()
    .int('timeMs must be a whole number')
    .min(0, 'timeMs must be non-negative')
    .max(600_000, 'timeMs exceeds maximum allowed value (10 min)'),
})

export type ClientAnswer = z.infer<typeof clientAnswerSchema>

// ─── Game submission ──────────────────────────────────────────────────────────

/**
 * Shape of the POST body sent to `/api/trivia/[slug]/submit`.
 *
 * - `triviaId`  — CUID of the trivia being played
 * - `answers`   — one entry per question that was shown
 * - `formData`  — arbitrary key→value pairs collected from the lead-capture form
 */
export const submitGameSchema = z.object({
  triviaId: z.string().cuid('Invalid trivia ID'),

  answers: z
    .array(clientAnswerSchema)
    .min(1, 'At least one answer is required')
    .max(200, 'Too many answers submitted'),

  /**
   * Lead-capture form data.
   * Keys are field names defined in the trivia's FormField records.
   * Values may be strings (text, email, phone, select, number) or booleans
   * (checkbox-style fields).
   */
  formData: z.record(
    z.string().min(1).max(50),
    z.union([z.string().max(500), z.boolean()]),
  ),
})

export type SubmitGameInput = z.infer<typeof submitGameSchema>
