// Author: Angel Colman
import Link from 'next/link'
import type { Metadata } from 'next'
import { RequestResetForm } from '@/components/cuenta/RecoverForms'

export const metadata: Metadata = {
  title: 'Recuperar contraseña | Automotor Play',
  robots: { index: false, follow: false },
}

export default function RecuperarPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-expanded text-3xl font-black tracking-tight text-white text-balance">
          ¿Olvidaste tu contraseña?
        </h1>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <RequestResetForm />
      </div>

      <p className="mt-5 text-center text-sm text-automotor-200">
        <Link
          href="/cuenta/ingresar"
          className="font-bold text-white underline underline-offset-2 transition-colors hover:text-automotor-300"
        >
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  )
}
