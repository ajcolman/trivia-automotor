// Author: Angel Colman

/**
 * Nombre de un participante a partir del `formData` de su lead.
 *
 * Cada trivia arma su propio formulario, así que las claves no son fijas: la
 * de Corea usa `nombres`/`apellidos` en plural y otras usan el singular. Había
 * tres lugares resolviendo esto por su cuenta con listas distintas -- la
 * landing, el ranking del juego y la pantalla de resultado -- y dos se
 * quedaban con `nombre`/`name`, así que contra un formulario en plural todos
 * los participantes aparecían como "Participante".
 */

const CLAVES_COMPLETO = ['nombre_completo', 'nombrecompleto', 'fullname', 'full_name']
const CLAVES_NOMBRE = ['nombres', 'nombre', 'names', 'name', 'firstname', 'first_name']
const CLAVES_APELLIDO = ['apellidos', 'apellido', 'lastname', 'last_name', 'surname']

const SIN_NOMBRE = 'Participante'

interface Nombre {
  /** Como lo cargó la persona: "Juan Domingo Falcón Medina". */
  completo: string
  /** Para tablas públicas: "Juan F.". */
  abreviado: string
}

/** Pares clave/valor no vacíos, con la clave normalizada para comparar. */
function entradas(formData: unknown): { clave: string; valor: string }[] {
  if (!formData || typeof formData !== 'object') return []
  return Object.entries(formData as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([k, v]) => ({ clave: k.toLowerCase().trim(), valor: (v as string).trim() }))
}

/** "Pérez Medina" -> "P." */
function inicial(apellido: string): string {
  const letra = apellido.trim()[0]
  return letra ? `${letra.toUpperCase()}.` : ''
}

export function participantName(formData: unknown): Nombre {
  const campos = entradas(formData)
  const buscar = (claves: string[]) => campos.find(c => claves.includes(c.clave))?.valor

  // Un campo de nombre completo gana: si el formulario lo pide así, partirlo
  // en nombre y apellido es adivinar.
  const completoDirecto = buscar(CLAVES_COMPLETO)
  if (completoDirecto) {
    const partes = completoDirecto.split(/\s+/)
    return {
      completo: completoDirecto,
      abreviado: partes.length > 1
        ? `${partes[0]} ${inicial(partes[partes.length - 1])}`
        : partes[0],
    }
  }

  const nombre = buscar(CLAVES_NOMBRE)
  const apellido = buscar(CLAVES_APELLIDO)

  if (nombre || apellido) {
    // El abreviado toma el primer nombre y la inicial del primer apellido:
    // "Juan Domingo" + "Falcón Medina" -> "Juan F.".
    const primerNombre = (nombre ?? '').split(/\s+/)[0] ?? ''
    const ini = apellido ? inicial(apellido) : ''
    return {
      completo: [nombre, apellido].filter(Boolean).join(' '),
      abreviado: [primerNombre, ini].filter(Boolean).join(' ') || (apellido ?? ''),
    }
  }

  // Último recurso: cualquier campo cuya clave suene a nombre y, si no hay
  // ninguno, el primer valor cargado. Es preferible a rotular a todos igual.
  const parecido = campos.find(c =>
    [...CLAVES_COMPLETO, ...CLAVES_NOMBRE, ...CLAVES_APELLIDO].some(k => c.clave.includes(k)),
  )
  const suelto = parecido?.valor ?? campos[0]?.valor
  if (!suelto) return { completo: SIN_NOMBRE, abreviado: SIN_NOMBRE }

  const partes = suelto.split(/\s+/)
  return {
    completo: suelto,
    abreviado: partes.length > 1 ? `${partes[0]} ${inicial(partes[partes.length - 1])}` : partes[0],
  }
}

/** "Juan Carlos Pérez" -> "Juan P." Para nombres que ya vienen de una cuenta. */
export function abbreviateName(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  return partes.length > 1 ? `${partes[0]} ${inicial(partes[partes.length - 1])}` : partes[0]
}
