// Author: Angel Colman
/**
 * Medidas recomendadas para cada imagen que se sube desde el panel.
 *
 * Viven juntas acá para que la misma imagen pida lo mismo en todos lados: el
 * banner de una trivia y el de un juego de predicción ocupan el mismo lugar
 * en la sala, así que no tiene sentido que cada pantalla sugiera un número
 * distinto. Son recomendaciones, no un límite: la subida no las valida.
 */

export interface MedidaImagen {
  ancho: number
  alto: number
  /** Aclaración corta: proporción, fondo transparente, etc. */
  nota?: string
}

export const MEDIDAS = {
  /** Fondo de cabecera: hero de trivia y banner de predicciones. */
  banner: {
    ancho: 1600,
    alto: 640,
    nota: 'Apaisada. Se recorta según el encuadre que elijas abajo.',
  },
  /** Logos de empresa, marca y trivia. */
  logo: {
    ancho: 400,
    alto: 160,
    nota: 'PNG con fondo transparente.',
  },
  /** Foto de un premio. Se muestra recortada en cuadrado. */
  premio: {
    ancho: 800,
    alto: 800,
    nota: 'Cuadrada.',
  },
  /** Flyer promocional de la trivia: llena la pantalla del gabinete. */
  flyer: {
    ancho: 1200,
    alto: 540,
    nota: 'Apaisada. Se recorta a lo ancho de la tarjeta.',
  },
} as const satisfies Record<string, MedidaImagen>

/** `1600 × 640 px`, con el signo de multiplicar de verdad. */
export function textoMedida(m: MedidaImagen): string {
  return `${m.ancho} × ${m.alto} px`
}
