// Author: Angel Colman
import Link from 'next/link'
import { PlayLockup } from '@/components/brand/PlayMark'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-automotor-950">
      <div className="h-1 bg-gradient-brand" aria-hidden="true" />

      <header className="flex justify-center px-4 py-4">
        <div className="rounded-xl bg-white px-3 py-2">
          <PlayLockup />
        </div>
      </header>

      <main className="flex-1 px-4 pb-12">
        <article
          className="prose prose-sm mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-xl
                     prose-headings:tracking-tight prose-h2:mt-0 prose-h2:font-black
                     prose-h3:font-bold prose-a:text-automotor-600 sm:p-8 sm:prose-base"
        >
          {children}
        </article>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-automotor-300">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/" className="underline-offset-2 hover:text-white hover:underline">
            Automotor Play
          </Link>
          <Link href="/terminos" className="underline-offset-2 hover:text-white hover:underline">
            Bases y condiciones
          </Link>
          <Link href="/privacidad" className="underline-offset-2 hover:text-white hover:underline">
            Política de privacidad
          </Link>
        </nav>
      </footer>
    </div>
  )
}
