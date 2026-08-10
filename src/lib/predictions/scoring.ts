// Author: Angel Colman
/**
 * Motor de puntaje de los mercados de predicción.
 *
 * Funciones puras: no tocan la base ni el reloj. El recálculo debe poder
 * correrse todas las veces que haga falta sobre el mismo mercado y dar siempre
 * el mismo resultado, porque en rally los tiempos se revisan después del tramo
 * por penalizaciones y la resolución cambia.
 */

export type MarketType = 'single_pick' | 'ordered_pick' | 'multi_pick' | 'numeric'

/** Parámetros por mercado. Viven en `Market.config` (Json). */
export interface MarketConfig {
  /** Puntos por acierto simple. `single_pick` y `multi_pick` (por cada acierto). */
  points?: number
  /** `ordered_pick`: puntos si TODAS las posiciones son correctas. */
  exactAllPoints?: number
  /** `ordered_pick`: puntos por contendiente acertado en la posición equivocada. */
  misplacedPoints?: number
  /** `ordered_pick` / `multi_pick`: cuántos se eligen. */
  positions?: number
  /** `numeric`: tolerancia para dar por bueno el valor. 0 = exacto. */
  tolerance?: number
}

/** Valores acordados para el WRC Rally del Paraguay 2026. */
export const PUNTAJE_WRC = {
  /** Ganador de tramo. */
  tramo: { points: 100 } satisfies MarketConfig,
  /** Podio final: 500 si los tres están en orden, 50 por piloto mal ubicado. */
  podio: {
    positions: 3,
    exactAllPoints: 500,
    misplacedPoints: 50,
  } satisfies MarketConfig,
} as const

function asArray(v: unknown): string[] | null {
  return Array.isArray(v) && v.every(x => typeof x === 'string') ? (v as string[]) : null
}

/**
 * Puntos que corresponden a una predicción dada una resolución.
 *
 * Ante cualquier forma inesperada devuelve 0 en vez de tirar error: los valores
 * vienen de columnas Json y un mercado mal cargado no puede tumbar el recálculo
 * de todos los demás.
 */
export function scorePrediction(
  type: MarketType,
  config: MarketConfig,
  prediction: unknown,
  resolution: unknown,
): number {
  switch (type) {
    case 'single_pick': {
      if (typeof prediction !== 'string' || typeof resolution !== 'string') return 0
      return prediction === resolution ? (config.points ?? 0) : 0
    }

    case 'ordered_pick': {
      const pick = asArray(prediction)
      const real = asArray(resolution)
      if (!pick || !real) return 0

      const slots = config.positions ?? real.length
      const p = pick.slice(0, slots)
      const r = real.slice(0, slots)

      // Acierto total: mismo contenido y mismo orden.
      const exact = p.length === r.length && p.every((id, i) => id === r[i])
      if (exact) return config.exactAllPoints ?? 0

      // Si no es exacto: cada elegido que esté en el podio real, sin importar
      // en qué posición lo pusimos, suma los puntos de "posición equivocada".
      const realSet = new Set(r)
      const contados = new Set<string>()
      let puntos = 0
      for (const id of p) {
        if (realSet.has(id) && !contados.has(id)) {
          contados.add(id)
          puntos += config.misplacedPoints ?? 0
        }
      }
      return puntos
    }

    case 'multi_pick': {
      const pick = asArray(prediction)
      const real = asArray(resolution)
      if (!pick || !real) return 0
      const realSet = new Set(real)
      const contados = new Set<string>()
      let puntos = 0
      for (const id of pick.slice(0, config.positions ?? pick.length)) {
        if (realSet.has(id) && !contados.has(id)) {
          contados.add(id)
          puntos += config.points ?? 0
        }
      }
      return puntos
    }

    case 'numeric': {
      if (typeof prediction !== 'number' || typeof resolution !== 'number') return 0
      const tol = config.tolerance ?? 0
      return Math.abs(prediction - resolution) <= tol ? (config.points ?? 0) : 0
    }

    default:
      return 0
  }
}

/** Valida que una predicción tenga la forma que el mercado espera, antes de guardarla. */
export function isValidPrediction(
  type: MarketType,
  config: MarketConfig,
  value: unknown,
): boolean {
  switch (type) {
    case 'single_pick':
      return typeof value === 'string' && value.length > 0
    case 'ordered_pick':
    case 'multi_pick': {
      const arr = asArray(value)
      if (!arr) return false
      if (config.positions && arr.length !== config.positions) return false
      return new Set(arr).size === arr.length // sin repetidos
    }
    case 'numeric':
      return typeof value === 'number' && Number.isFinite(value)
    default:
      return false
  }
}
