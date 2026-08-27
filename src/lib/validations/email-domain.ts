// Author: Angel Colman
/**
 * Detección de dominios mal tipeados en el correo.
 *
 * Nace de un caso real: de 182 jugadores sin verificar en el Rally 2026,
 * cuatro tenían el dominio roto (`gmail.con`, `gimail.com`, `glail.com`) y por
 * eso nunca pudieron recibir el enlace de confirmación ni, llegado el caso,
 * el aviso de que ganaron.
 *
 * La detección SUGIERE, no bloquea. Un dominio raro no es necesariamente un
 * error —hay correos corporativos legítimos a una letra de uno popular, como
 * `email.com` frente a `gmail.com`— y dejar a alguien afuera del registro es
 * peor que aceptarle una dirección rara.
 */

/** Dominios que concentran casi todas las cuentas de los jugadores. */
const DOMINIOS_POPULARES = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'outlook.es',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'hotmail.es',
  'protonmail.com',
  'me.com',
]

/**
 * Distancia de Levenshtein con corte: apenas supera `maximo` deja de calcular.
 * Solo nos interesa saber si hay una única letra de diferencia.
 */
function distancia(a: string, b: string, maximo: number): number {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1

  let previa = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    let mejorDeLaFila = i

    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      const valor = Math.min(
        previa[j] + 1, // borrar
        actual[j - 1] + 1, // insertar
        previa[j - 1] + costo, // sustituir
      )
      actual.push(valor)
      if (valor < mejorDeLaFila) mejorDeLaFila = valor
    }

    if (mejorDeLaFila > maximo) return maximo + 1
    previa = actual
  }

  return previa[b.length]
}

/**
 * Devuelve el correo corregido si el dominio parece un error de tipeo, o null
 * si no hay nada que sugerir.
 *
 *   sugerirCorreo('juan@gmail.con')  -> 'juan@gmail.com'
 *   sugerirCorreo('juan@glail.com')  -> 'juan@gmail.com'
 *   sugerirCorreo('juan@empresa.py') -> null
 */
export function sugerirCorreo(email: string): string | null {
  const limpio = email.trim().toLowerCase()
  const corte = limpio.lastIndexOf('@')
  if (corte < 1) return null

  const usuario = limpio.slice(0, corte)
  const dominio = limpio.slice(corte + 1)
  if (!dominio.includes('.')) return null

  // `.con` no existe como dominio de primer nivel: siempre es un `.com` mal
  // tipeado. Vale incluso para dominios que no están en la lista de populares.
  if (dominio.endsWith('.con')) {
    return `${usuario}@${dominio.slice(0, -4)}.com`
  }

  if (DOMINIOS_POPULARES.includes(dominio)) return null

  for (const candidato of DOMINIOS_POPULARES) {
    if (distancia(dominio, candidato, 1) <= 1) {
      return `${usuario}@${candidato}`
    }
  }

  return null
}
