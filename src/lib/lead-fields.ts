// Author: Angel Colman
/**
 * Qué campos del formulario de una trivia ya los sabe la cuenta del jugador.
 *
 * Cuando la trivia exige cuenta, esos campos no se le preguntan: se completan
 * desde los datos de la cuenta, en el servidor. Dos motivos:
 *
 * - No tiene sentido pedirle el nombre a alguien que acaba de iniciar sesión.
 * - Son los datos con los que se entrega un premio. Si vinieran del
 *   formulario, el jugador podría escribir un nombre o una cédula distintos a
 *   los de su cuenta y quedarían dos versiones del mismo dato.
 *
 * Lo que la cuenta no sabe -- modelo de interés, sucursal, lo que cada trivia
 * quiera preguntar -- sigue viviendo en el formulario final.
 */

export interface DatosCuenta {
  fullName: string
  email: string
  phone: string
  cedula: string | null
}

export interface CampoFormulario {
  fieldName: string
  fieldLabel: string
  fieldType: string
}

/**
 * Devuelve el valor de la cuenta que corresponde a este campo, o `null` si el
 * campo pregunta algo que la cuenta no tiene.
 *
 * Se compara contra el nombre y la etiqueta porque cada trivia nombra sus
 * campos como quiere: `nombre`, `Nombre completo`, `first_name`…
 */
export function valorDesdeCuenta(
  campo: CampoFormulario,
  cuenta: DatosCuenta,
): string | null {
  const clave = `${campo.fieldName} ${campo.fieldLabel}`.toLowerCase()

  if (campo.fieldType === 'email' || /mail|correo/.test(clave)) return cuenta.email
  if (campo.fieldType === 'phone' || /tel[eé]fono|celular|whatsapp|movil|móvil/.test(clave)) return cuenta.phone
  if (/c[eé]dula|documento|\bci\b|\bdni\b/.test(clave)) return cuenta.cedula ?? ''
  if (/apellido|last.?name/.test(clave)) {
    const partes = cuenta.fullName.trim().split(/\s+/)
    return partes.length > 1 ? partes.slice(1).join(' ') : cuenta.fullName
  }
  if (/nombre|first.?name|\bname\b/.test(clave)) {
    return cuenta.fullName.trim().split(/\s+/)[0]
  }
  return null
}

/** True si la cuenta ya cubre este campo y no hace falta preguntarlo. */
export function loCubreLaCuenta(campo: CampoFormulario, cuenta: DatosCuenta): boolean {
  return valorDesdeCuenta(campo, cuenta) !== null
}

/**
 * Completa los datos personales desde la cuenta y conserva lo que el jugador
 * respondió en los campos que la cuenta no cubre.
 *
 * Los valores de la cuenta pisan lo que venga del cliente: son la fuente de
 * verdad para entregar el premio.
 */
export function combinarConCuenta(
  campos: CampoFormulario[],
  respuestas: Record<string, unknown>,
  cuenta: DatosCuenta,
): Record<string, unknown> {
  const resultado = { ...respuestas }
  for (const campo of campos) {
    const valor = valorDesdeCuenta(campo, cuenta)
    if (valor !== null) resultado[campo.fieldName] = valor
  }
  return resultado
}
