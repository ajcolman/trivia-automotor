// Author: Angel Colman
/**
 * Lo que define el alcance del juego del Transchaco Rally 2026.
 *
 * Vive aparte porque lo comparten el cargador de inscriptos y el de
 * elegibilidad, y tienen que decir lo mismo: si uno diera por participante a
 * alguien que el otro no habilita en ningún tramo, quedaría una tripulación
 * visible que no se puede elegir en ninguna parte.
 */

export const SLUG = 'transchaco-rally-2026'

/**
 * Las divisiones sobre las que pregunta el juego.
 *
 * El rally reúne tres competencias que comparten la marca y poco más. El
 * Touring publica una clasificación y un juego de resultados para cada una
 * ("Tandas 1 - Nacional", "- Camionetas", "- Historicos"), las corre en tandas
 * separadas y a los históricos les dio un itinerario propio de 8 pruebas
 * especiales que no es el que tenemos cargado.
 *
 * Preguntar "quién ganó el PE2" sin decir de qué división no tiene una
 * respuesta única, así que el juego es sobre los autos: es la división con
 * clasificación general del rally y la que sigue la prensa.
 *
 * Las otras quedan cargadas como inscriptas pero inactivas. No se borran: son
 * parte de la lista oficial y alcanza con reactivarlas si algún día el juego
 * las incluye.
 */
export const DIVISIONES = ['autos'] as const

/**
 * Las pruebas de clasificación.
 *
 * Las corren las tres divisiones, pero en tandas separadas y a horarios muy
 * distintos -- los autos desde las 10:00, las camionetas desde las 13:50 --,
 * así que tampoco acá tiene sentido mezclarlas: una sola pregunta no puede
 * cerrar a dos horas a la vez.
 *
 * Lo que las distingue de las etapas es otra cosa: las largan todos los autos
 * inscriptos, incluidos los que no siguen a las etapas.
 */
export const CLASIFICACION = ['PSE1A', 'PSE1B']
