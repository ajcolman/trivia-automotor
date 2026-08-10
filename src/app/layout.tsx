// Author: Angel Colman
import type { Metadata } from 'next'
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
  title: 'Automotor Play | Jugá y ganá premios',
  description: 'Automotor Play: juegos interactivos con premios y merch oficial de Automotor S.A. y Carmotor S.A.',
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
