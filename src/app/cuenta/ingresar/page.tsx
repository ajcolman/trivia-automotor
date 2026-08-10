// Author: Angel Colman
import Link from 'next/link'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from '@/components/cuenta/LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar sesión | Automotor Play',
  description: 'Entrá a tu cuenta de Automotor Play.',
}

export default function IngresarPage() {
  return (
    <>
      <div className="text-center mb-6">
        <h1 className="font-expanded text-3xl font-black text-white tracking-tight">
          Iniciá sesión
        </h1>
        <p className="text-automotor-200 text-sm mt-2">
          Para seguir jugando y ver tus puntos.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl">
        <Suspense fallback={<div className="h-72" />}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="text-center text-sm text-automotor-200 mt-5">
        ¿Todavía no tenés cuenta?{' '}
        <Link
          href="/cuenta/registro"
          className="font-bold text-white underline underline-offset-2 hover:text-automotor-300 transition-colors"
        >
          Creá una
        </Link>
      </p>
    </>
  )
}
