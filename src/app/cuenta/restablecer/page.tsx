// Author: Angel Colman
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/cuenta/RecoverForms'

export const metadata: Metadata = {
  title: 'Elegir contraseña nueva | Automotor Play',
  robots: { index: false, follow: false },
}

export default function RestablecerPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-expanded text-3xl font-black tracking-tight text-white text-balance">
          Elegí una contraseña nueva
        </h1>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <Suspense fallback={<div className="h-48" aria-hidden="true" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  )
}
