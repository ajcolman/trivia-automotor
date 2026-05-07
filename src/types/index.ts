import type { DefaultSession } from 'next-auth'
import type {
  Trivia,
  Question,
  FormField,
  Lead,
  GameSession,
  Company,
  Brand,
  User,
  UserRole,
} from '@prisma/client'

// ─── NextAuth module augmentation ────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }

  interface User {
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    id: string
  }
}

// ─── Session / Auth types ────────────────────────────────────────────────────

/** The shape of `session.user` after NextAuth augmentation. */
export interface SessionUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  role: UserRole | string
}

// ─── Trivia with relations ────────────────────────────────────────────────────

export type TriviaWithRelations = Trivia & {
  questions: Question[]
  formFields: FormField[]
  company: Company | null
  brand: Brand | null
  creator: Pick<User, 'id' | 'name' | 'email'>
  _count?: {
    leads: number
    gameSessions: number
  }
}

export type TriviaWithCounts = Trivia & {
  _count: {
    leads: number
    gameSessions: number
    questions: number
  }
  company: Pick<Company, 'id' | 'name' | 'slug'> | null
  brand: Pick<Brand, 'id' | 'name'> | null
}

// ─── Lead with trivia ─────────────────────────────────────────────────────────

export type LeadWithTrivia = Lead & {
  trivia: Pick<Trivia, 'id' | 'title' | 'slug'>
}

// ─── Admin dashboard stats ────────────────────────────────────────────────────

export interface AdminStats {
  /** Total number of trivias in the system (or for this company). */
  totalTrivias: number
  /** Total number of leads collected. */
  totalLeads: number
  /** Total number of unique game sessions started. */
  totalSessions: number
  /** Trivias currently active (isActive && within date range). */
  activeTrivias: number
  /** Average score across all completed leads (0-100 percentage). */
  averageScorePercent: number
  /** Number of leads collected in the current calendar month. */
  leadsThisMonth: number
}

// ─── Company with counts ──────────────────────────────────────────────────────

export type CompanyWithCounts = Company & {
  _count: {
    trivias: number
    users: number
    brands: number
  }
}

// ─── Brand with models ────────────────────────────────────────────────────────

export type BrandWithCompany = Brand & {
  company: Pick<Company, 'id' | 'name' | 'slug'>
}

// ─── Scored answer (client-safe subset) ──────────────────────────────────────

export interface PublicScoredAnswer {
  questionId: string
  chosen: number
  correct: boolean
  earnedPoints: number
  maxPoints: number
}

// ─── Game result returned to the player ──────────────────────────────────────

export interface GameResult {
  score: number
  maxScore: number
  scoredAnswers: PublicScoredAnswer[]
  leadId: string
}

// ─── Pagination helpers ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── API error shape ──────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  details?: unknown
}
