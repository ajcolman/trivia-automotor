// Author: Angel Colman
import type { Metadata } from 'next'
import { siteUrl } from '@/lib/site-url'
import { Archivo } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

// Archivo variable (wght + wdth): una sola familia self-hosted, sin request
// externo. El eje de anchura permite headings expandidos (ver .font-expanded).
const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  axes: ['wdth'],
})

export const metadata: Metadata = {
  // Sin esto, una imagen declarada con ruta relativa no se resuelve a una
  // dirección absoluta y los previsualizadores la descartan.
  metadataBase: new URL(siteUrl()),
  title: 'Automotor Play | Jugá y ganá premios',
  description: 'Automotor Play: juegos interactivos con premios y merch oficial de Automotor S.A. y Carmotor S.A.',
  openGraph: {
    type: 'website',
    siteName: 'Automotor Play',
    locale: 'es_PY',
    title: 'Automotor Play | Jugá y ganá premios',
    description: 'Jugá, sumá puntos y llevate premios y merch oficial de Automotor.',
  },
  twitter: { card: 'summary_large_image' },
  authors: [{ name: 'Angel Colman' }],
  icons: { icon: '/favicon.png', shortcut: '/favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${archivo.variable} font-sans`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
