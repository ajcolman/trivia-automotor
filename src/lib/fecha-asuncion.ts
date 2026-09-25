// Author: Angel Colman
/**
 * Conversión entre instantes y lo que espera un `<input type="datetime-local">`,
 * siempre en hora de Asunción.
 *
 * El input no lleva zona: si se usara la del navegador, alguien editando el
 * itinerario desde otro huso vería y guardaría horarios corridos.
 */

const TZ = 'America/Asuncion'

/** ISO → `YYYY-MM-DDTHH:mm` en hora de Asunción. */
export function aInputLocal(iso: string | Date): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso))
  const v = (t: string) => p.find(x => x.type === t)!.value
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`
}

/** `YYYY-MM-DDTHH:mm` leído como hora de Asunción → ISO absoluto. */
export function desdeInputLocal(valor: string): string {
  // Paraguay usa UTC-03:00 todo el año desde 2024.
  return new Date(`${valor}:00-03:00`).toISOString()
}

/** Formato corto para listados: `dd/mm HH:mm`. */
export const formatoCorto = new Intl.DateTimeFormat('es-PY', {
  timeZone: TZ, day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})
