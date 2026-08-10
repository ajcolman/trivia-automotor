// Author: Angel Colman
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { VerifyPanel } from '@/components/cuenta/VerifyPanel'

export const metadata: Metadata = {
  title: 'Confirmar cuenta | Automotor Play',
  robots: { index: false, follow: false },
}

export default function VerificarPage() {
  return (
    <Suspense
      fallback={<div className="bg-white rounded-2xl p-8 shadow-xl h-48" aria-hidden="true" />}
    >
      <VerifyPanel />
    </Suspense>
  )
}
