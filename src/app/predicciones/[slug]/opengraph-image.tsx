// Author: Angel Colman
import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'
import { siteUrl } from '@/lib/site-url'

/**
 * La tarjeta que se ve al compartir un juego de predicción.
 *
 * Se dibuja acá en vez de apuntar al banner directamente por dos razones. La
 * primera es el peso: los previsualizadores descartan las imágenes grandes y
 * un banner recién subido puede pesar varios MB. La segunda es que el banner
 * solo no dice nada -- en una tarjeta de WhatsApp, que se ve chica, hace
 * falta que el título esté dibujado encima.
 */

export const runtime = 'nodejs'
// La tarjeta cambia poco y se pide cada vez que alguien reenvía el enlace.
export const revalidate = 3600
export const alt = 'Juego de predicción en Automotor Play'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * La Archivo en negrita, que es la tipografía del sitio.
 *
 * El generador no entiende woff2, que es lo que deja `next/font`, así que se
 * pide el TTF: mandando un navegador viejo en el User-Agent, Google sirve ese
 * formato. Si falla, la tarjeta sale con la tipografía por defecto -- se ve
 * bien igual, solo sin el peso -- antes que no salir.
 */
async function traerArchivo(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Archivo:wght@700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)' }, signal: AbortSignal.timeout(3000) },
    ).then(r => r.text())

    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('truetype'\)/)?.[1]
    if (!url) return null

    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

/** Lo que se le anima a traer a la tarjeta sin que tarde de más. */
const PESO_MAXIMO_BANNER = 2 * 1024 * 1024

/**
 * Trae el banner como data URL, si es razonable.
 *
 * Los blobs del proyecto son privados y se sirven por `/api/media`, así que
 * se pide por ahí. Con un banner pesado se devuelve null y la tarjeta queda
 * con el degradado del juego, que siempre se ve bien.
 */
async function traerBanner(url: string): Promise<string | null> {
  const corte = AbortSignal.timeout(4000)
  try {
    const absoluta = url.includes('vercel-storage.com')
      ? `${siteUrl()}/api/media?url=${encodeURIComponent(url)}`
      : url.startsWith('http') ? url : `${siteUrl()}${url}`

    const res = await fetch(absoluta, { signal: corte })
    if (!res.ok) return null

    const declarado = Number(res.headers.get('content-length') ?? 0)
    if (declarado > PESO_MAXIMO_BANNER) return null

    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.byteLength > PESO_MAXIMO_BANNER) return null

    const tipo = res.headers.get('content-type') ?? 'image/jpeg'
    return `data:${tipo};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const evento = await prisma.predictionEvent.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      description: true,
      primaryColor: true,
      secondaryColor: true,
      heroImageUrl: true,
      brand: { select: { name: true } },
      _count: { select: { markets: true, prizes: true } },
    },
  })

  const titulo = evento?.title ?? 'Automotor Play'
  const primario = evento?.primaryColor ?? '#005CA8'
  const secundario = evento?.secondaryColor ?? '#004071'
  const [banner, archivo] = await Promise.all([
    evento?.heroImageUrl ? traerBanner(evento.heroImageUrl) : Promise.resolve(null),
    traerArchivo(),
  ])

  const datos = [
    evento?._count.markets ? `${evento._count.markets} predicciones` : null,
    evento?._count.prizes ? `${evento._count.prizes} premios` : null,
  ].filter(Boolean) as string[]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          background: `linear-gradient(135deg, ${primario}, ${secundario})`,
          position: 'relative',
          fontFamily: archivo ? 'Archivo' : undefined,
        }}
      >
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, objectFit: 'cover' }}
          />
        )}

        {/* Velo: la foto puede ser clara y el título tiene que leerse igual. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: banner
              ? 'linear-gradient(180deg, rgba(2,31,57,0.35) 0%, rgba(2,31,57,0.92) 100%)'
              : 'linear-gradient(180deg, rgba(2,31,57,0.10) 0%, rgba(2,31,57,0.55) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            padding: '0 64px 56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                background: '#FB923C',
                color: '#021F39',
                fontSize: 24,
                fontWeight: 900,
                padding: '8px 20px',
                borderRadius: 999,
                letterSpacing: 2,
              }}
            >
              AUTOMOTOR PLAY
            </div>
            {evento?.brand && (
              <div
                style={{
                  display: 'flex',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                Organiza {evento.brand.name}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              color: 'white',
              fontSize: titulo.length > 38 ? 68 : 86,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {titulo}
          </div>

          {datos.length > 0 && (
            <div style={{ display: 'flex', gap: 28, marginTop: 24 }}>
              {datos.map(d => (
                <div
                  key={d}
                  style={{
                    display: 'flex',
                    color: 'white',
                    fontSize: 30,
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.16)',
                    padding: '10px 26px',
                    borderRadius: 999,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      ...(archivo
        ? { fonts: [{ name: 'Archivo', data: archivo, weight: 700 as const, style: 'normal' as const }] }
        : {}),
    },
  )
}
