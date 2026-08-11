// Author: Angel Colman
/**
 * Salvaguarda de contraste para colores que elige quien crea una trivia.
 *
 * El panel de administración deja elegir libremente `backgroundColor` y
 * `textColor` (entre otros) por trivia -- eso es intencional, ver
 * ColorPicker.tsx. Pero nada impide guardar una combinación que en pantalla
 * resulta ilegible (p. ej. fondo claro con texto claro). Esta utilidad no
 * reemplaza la elección del creador: solo actúa cuando el par elegido no
 * llega al contraste mínimo AA (4.5:1), y en ese caso cae a negro o blanco
 * puro, lo que dé más contraste contra el fondo.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/** Razón de contraste WCAG entre dos colores hex. Devuelve `null` si alguno es inválido. */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const rgbA = hexToRgb(hexA)
  const rgbB = hexToRgb(hexB)
  if (!rgbA || !rgbB) return null
  const lumA = relativeLuminance(rgbA)
  const lumB = relativeLuminance(rgbB)
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA]
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Devuelve `textColor` si cumple contraste AA (4.5:1 por defecto) contra
 * `backgroundColor`; si no, o si alguno de los dos hex es inválido, cae a
 * negro o blanco puro -- el que dé más contraste --.
 */
export function readableTextColor(textColor: string, backgroundColor: string, minRatio = 4.5): string {
  const ratio = contrastRatio(textColor, backgroundColor)
  if (ratio !== null && ratio >= minRatio) return textColor

  const blackRatio = contrastRatio('#000000', backgroundColor) ?? 0
  const whiteRatio = contrastRatio('#ffffff', backgroundColor) ?? 0
  return whiteRatio >= blackRatio ? '#ffffff' : '#000000'
}

/**
 * Color de texto legible sobre un degradado de dos colores.
 *
 * Los encabezados usan `primaryColor → secondaryColor` y encima va texto
 * blanco, lo que asume que ambos son oscuros. Si alguien elige un primario
 * claro, ese título queda ilegible. Se evalúa contra el extremo más exigente
 * de los dos, para que el texto funcione a lo largo de todo el degradado y no
 * solo en una punta.
 */
export function readableOnGradient(from: string, to: string, minRatio = 4.5): string {
  const peorParaBlanco = Math.min(
    contrastRatio('#ffffff', from) ?? 0,
    contrastRatio('#ffffff', to) ?? 0,
  )
  if (peorParaBlanco >= minRatio) return '#ffffff'

  const peorParaNegro = Math.min(
    contrastRatio('#000000', from) ?? 0,
    contrastRatio('#000000', to) ?? 0,
  )
  return peorParaNegro >= peorParaBlanco ? '#000000' : '#ffffff'
}
