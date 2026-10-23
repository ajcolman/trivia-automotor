// Author: Angel Colman
import type { MarketConfig, MarketType } from '@/lib/predictions/scoring'

export interface ContenderDTO {
  id: string
  number: string | null
  name: string
  subtitle: string | null
  teamName: string | null
  category: string | null
  isFeatured: boolean
}

export interface SegmentDTO {
  code: string
  name: string
  distanceKm: number | null
  /** ISO. La hora de largada del primer auto. */
  startsAt: string | null
  isCancelled: boolean
}

export interface MarketDTO {
  id: string
  type: MarketType
  title: string
  config: MarketConfig
  /** ISO. Momento en que deja de aceptarse la predicción. */
  locksAt: string
  segment: SegmentDTO | null
  /**
   * Quiénes se pueden elegir acá. Null = todos los del juego.
   *
   * No todas las tripulaciones inscriptas largan todos los tramos, y a una que
   * no larga no se le puede ganar.
   */
  contenderIds: string[] | null
  pick: string | string[] | number | null
  pointsAwarded: number | null
}

export interface PremioDTO {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  position: number
}
