// Author: Angel Colman
import Link from 'next/link'
import type { Metadata } from 'next'
import { RegisterForm } from '@/components/cuenta/RegisterForm'

export const metadata: Metadata = {
  title: 'Crear cuenta | Automotor Play',
  description: 'Creá tu cuenta para jugar y competir por premios y merch de Automotor.',
}

export default function RegistroPage() {
  return (
    <>
      <div className="text-center mb-6">
        <h1 className="font-expanded text-3xl font-black text-white tracking-tight text-balance">
          Creá tu cuenta
        </h1>
        <p className="text-automotor-200 text-sm mt-2 text-balance">
          Es el único paso antes de jugar. Necesitamos tus datos para poder entregarte el premio.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl">
        <RegisterForm />
      </div>

      <p className="text-center text-sm text-automotor-200 mt-5">
        ¿Ya tenés cuenta?{' '}
        <Link
          href="/cuenta/ingresar"
          className="font-bold text-white underline underline-offset-2 hover:text-automotor-300 transition-colors"
        >
          Iniciá sesión
        </Link>
      </p>
    </>
  )
}
