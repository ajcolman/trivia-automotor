// Author: Angel Colman
import { revalidatePath } from 'next/cache'

/**
 * Invalida las páginas cacheadas que muestran datos del panel.
 *
 * La sala (`/`) se sirve con `revalidate = 60` y las legales con 300: sin esto
 * un cambio del admin tarda hasta ese lapso en verse y, como la primera visita
 * después del vencimiento todavía devuelve la copia vieja mientras regenera,
 * en la práctica hacen falta dos recargas. Solo se nota en producción -- en
 * dev cada request se renderiza de nuevo -- que es por qué pasaba inadvertido.
 */
export function revalidateLanding() {
  revalidatePath('/')
}

/** Las legales salen de PlatformSettings y se cachean aparte. */
export function revalidateLegales() {
  revalidatePath('/terminos')
  revalidatePath('/privacidad')
}
