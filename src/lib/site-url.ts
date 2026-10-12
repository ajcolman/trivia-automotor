// Author: Angel Colman
/**
 * La dirección pública del sitio, para armar enlaces absolutos.
 *
 * Los metadatos que lee WhatsApp -- y cualquier otro previsualizador -- no
 * admiten rutas relativas: la imagen y la URL de una tarjeta tienen que venir
 * con dominio. Del lado del cliente alcanza `window.location.origin`; esto es
 * para el servidor, donde no hay ventana.
 *
 * En Vercel sale de `VERCEL_PROJECT_PRODUCTION_URL`, que siempre apunta al
 * dominio de producción aunque el código corra en una preview: un enlace
 * compartido tiene que llevar al sitio de verdad, no a un deploy de prueba.
 */
export function siteUrl(): string {
  const produccion = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (produccion) return `https://${produccion}`

  const configurada = process.env.NEXT_PUBLIC_APP_URL
  if (configurada) return configurada.replace(/\/+$/, '')

  return 'http://localhost:3000'
}
