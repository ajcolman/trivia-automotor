// Author: Angel Colman
import Link from 'next/link'
import { PlayLockup } from '@/components/brand/PlayMark'

export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-automotor-950 flex flex-col">
      <div className="h-1 bg-gradient-to-r from-automotor-600 via-automotor-400 to-brand-accent" />

      <header className="px-4 py-4 flex justify-center">
        <div className="bg-white rounded-xl px-3 py-2">
          <PlayLockup />
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 flex flex-col items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-4 py-6 text-center">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-automotor-300">
          <Link href="/" className="underline-offset-2 transition-colors hover:text-white hover:underline">
            Volver a Automotor Play
          </Link>
          <Link href="/terminos" className="underline-offset-2 transition-colors hover:text-white hover:underline">
            Bases y condiciones
          </Link>
          <Link href="/privacidad" className="underline-offset-2 transition-colors hover:text-white hover:underline">
            Política de privacidad
          </Link>
        </nav>
      </footer>
    </div>
  )
}
