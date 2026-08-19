// Author: Angel Colman
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // El lint se corre a mano con `npm run lint`, no durante el build. Next
    // lo corre solo cuando hay config de ESLint y aborta el build ante el
    // primer error: no vale la pena que un deploy se caiga por una comilla
    // sin escapar. Si en algún momento querés que el build lo exija, sacá
    // esta clave.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Impide que el sitio se cargue dentro de un iframe ajeno: sin esto,
          // alguien puede superponer su interfaz sobre la nuestra y hacer que
          // el jugador crea que hace clic en otra cosa.
          { key: 'X-Frame-Options', value: 'DENY' },
          // El navegador respeta el tipo declarado y no lo adivina, que es como
          // una imagen subida termina ejecutándose como script.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // No filtramos la URL completa a sitios externos; los enlaces de
          // verificación y de recuperación llevan el token en la dirección.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // La plataforma no usa cámara, micrófono ni ubicación.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Fuerza HTTPS durante un año, incluidos subdominios.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        // Nada de lo que cuelga de /api debe quedar cacheado por el navegador
        // ni por intermediarios: son datos de cuentas y predicciones.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },
}

export default nextConfig
