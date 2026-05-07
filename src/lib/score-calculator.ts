// ─── Types ────────────────────────────────────────────────────────────────────

/** Authoritative question data sourced from the database (server-side). */
export interface QuestionRecord {
  id: string
  correctAnswer: number
  points: number
  /** Time limit in seconds */
  timeLimit: number
}

/** Answer submitted by the client. */
export interface ClientAnswer {
  questionId: string
  /** Index of the chosen option (0-based) */
  chosen: number
  /** Time elapsed when the player answered, in milliseconds */
  timeMs: number
}

/** Per-question breakdown returned to the caller. */
export interface ScoredAnswer {
  questionId: string
  chosen: number
  correct: boolean
  earnedPoints: number
  maxPoints: number
  timeTakenMs: number
  speedBonus: number
}

/** Full result returned by `calculateScore`. */
export interface ScoreResult {
  score: number
  maxScore: number
  scoredAnswers: ScoredAnswer[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Minimum speed multiplier applied when the player answers at exactly the
 * time limit.  Answers faster than this threshold receive more points.
 *
 * A value of 0.5 means "at least 50 % of the question's point value is
 * awarded for any correct answer, regardless of how slow."
 */
const MIN_SPEED_MULTIPLIER = 0.5

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Server-side score calculation.
 *
 * Scoring rules:
 * - A wrong answer earns 0 points.
 * - A correct answer earns `points * speedMultiplier` points (rounded to the
 *   nearest integer), where:
 *     - `speedMultiplier` = 1.0   if the answer arrived instantly (timeMs ≈ 0)
 *     - `speedMultiplier` scales linearly down to `MIN_SPEED_MULTIPLIER` (0.5)
 *       as `timeMs` approaches `timeLimit * 1000` ms.
 *     - Answers that somehow exceed the time limit still receive the minimum
 *       (timing skew protection).
 *
 * Questions not present in `answers` are treated as wrong (0 points).
 * Extra answers with unknown questionIds are silently ignored.
 *
 * @param questions  Authoritative question records from the database.
 * @param answers    Raw answers submitted by the client.
 * @returns          `{ score, maxScore, scoredAnswers }`
 */
export function calculateScore(
  questions: QuestionRecord[],
  answers: ClientAnswer[],
): ScoreResult {
  // Index answers by questionId for O(1) look-up
  const answerMap = new Map<string, ClientAnswer>(
    answers.map((a) => [a.questionId, a]),
  )

  let score = 0
  let maxScore = 0
  const scoredAnswers: ScoredAnswer[] = []

  for (const question of questions) {
    maxScore += question.points

    const clientAnswer = answerMap.get(question.id)

    if (!clientAnswer) {
      // Question was not answered
      scoredAnswers.push({
        questionId: question.id,
        chosen: -1,
        correct: false,
        earnedPoints: 0,
        maxPoints: question.points,
        timeTakenMs: 0,
        speedBonus: 0,
      })
      continue
    }

    const correct = clientAnswer.chosen === question.correctAnswer

    if (!correct) {
      scoredAnswers.push({
        questionId: question.id,
        chosen: clientAnswer.chosen,
        correct: false,
        earnedPoints: 0,
        maxPoints: question.points,
        timeTakenMs: clientAnswer.timeMs,
        speedBonus: 0,
      })
      continue
    }

    // ── Speed bonus calculation ──
    const timeLimitMs = question.timeLimit * 1000
    const elapsed = Math.max(0, clientAnswer.timeMs)

    // How far through the window the player answered (0 = instant, 1 = at limit)
    const ratio = Math.min(elapsed / timeLimitMs, 1)

    // speedMultiplier goes from 1.0 (instant) to MIN_SPEED_MULTIPLIER (at limit)
    const speedMultiplier =
      1 - ratio * (1 - MIN_SPEED_MULTIPLIER)

    const earnedPoints = Math.round(question.points * speedMultiplier)
    // Speed bonus = extra points earned above the minimum
    const speedBonus = earnedPoints - Math.round(question.points * MIN_SPEED_MULTIPLIER)

    score += earnedPoints

    scoredAnswers.push({
      questionId: question.id,
      chosen: clientAnswer.chosen,
      correct: true,
      earnedPoints,
      maxPoints: question.points,
      timeTakenMs: elapsed,
      speedBonus: Math.max(0, speedBonus),
    })
  }

  return { score, maxScore, scoredAnswers }
}
