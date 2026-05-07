// Author: Angel Colman
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Automotor Trivia | Plataforma de Trivias',
  description: 'Plataforma de trivias interactivas para Automotor S.A. y Carmotor S.A.',
  authors: [{ name: 'Angel Colman' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
