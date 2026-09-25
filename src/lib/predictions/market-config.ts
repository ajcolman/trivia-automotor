// Author: Angel Colman
/**
 * Puente entre lo que el panel deja cargar y lo que entiende el motor de
 * puntaje (`scoring.ts`).
 *
 * `Market.config` es una columna Json, así que nada impide guardar ahí un
 * objeto que el evaluador después ignore -- y una pregunta mal configurada no
 * da error: reparte cero puntos en silencio. Por eso la config se normaliza
 * acá, dejando solo las claves que el tipo de pregunta usa de verdad.
 */
import { z } from 'zod'
import type { MarketConfig, MarketType } from './scoring'

export const configSchema = z.object({
  points: z.number().int().min(0).max(100000).optional(),
  exactAllPoints: z.number().int().min(0).max(100000).optional(),
  misplacedPoints: z.number().int().min(0).max(100000).optional(),
  positions: z.number().int().min(1).max(20).optional(),
  tolerance: z.number().min(0).max(1000000).optional(),
})

/** Cómo se le explica cada tipo de pregunta a quien arma el juego. */
export const TIPOS_MERCADO: {
  valor: MarketType
  texto: string
  ayuda: string
  /** Claves de config que este tipo realmente usa. */
  campos: (keyof MarketConfig)[]
}[] = [
  {
    valor: 'single_pick',
    texto: 'Elegir uno',
    ayuda: 'El jugador elige un solo participante. Típico: ganador de un tramo.',
    campos: ['points'],
  },
  {
    valor: 'ordered_pick',
    texto: 'Elegir en orden',
    ayuda: 'El jugador arma un podio ordenado. Puntúa distinto si acierta todo o si acierta al participante en otra posición.',
    campos: ['positions', 'exactAllPoints', 'misplacedPoints'],
  },
  {
    valor: 'multi_pick',
    texto: 'Elegir varios',
    ayuda: 'El jugador elige un grupo sin importar el orden. Suma por cada acierto.',
    campos: ['positions', 'points'],
  },
  {
    valor: 'numeric',
    texto: 'Número',
    ayuda: 'El jugador escribe un número. Suma si cae dentro de la tolerancia.',
    campos: ['points', 'tolerance'],
  },
]

/** Valores de arranque de cada tipo, alineados con lo usado en el rally. */
export const CONFIG_POR_DEFECTO: Record<MarketType, MarketConfig> = {
  single_pick: { points: 100 },
  ordered_pick: { positions: 3, exactAllPoints: 500, misplacedPoints: 50 },
  multi_pick: { positions: 3, points: 50 },
  numeric: { points: 100, tolerance: 0 },
}

/**
 * Deja en la config solo lo que el tipo usa, completando con el valor por
 * defecto lo que falte. Así una pregunta creada desde el panel siempre reparte
 * los puntos que muestra.
 */
export function normalizarConfig(type: MarketType, config: MarketConfig): MarketConfig {
  const campos = TIPOS_MERCADO.find(t => t.valor === type)?.campos ?? []
  const base = CONFIG_POR_DEFECTO[type] ?? {}
  const salida: MarketConfig = {}
  for (const campo of campos) {
    const valor = config[campo] ?? base[campo]
    if (valor !== undefined) salida[campo] = valor as never
  }
  return salida
}
