// Author: Angel Colman
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { MailWarning, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Mi cuenta | Automotor Play',
  robots: { index: false, follow: false },
}

export default async function CuentaPage() {
  const session = await getServerSession(authOptions)

  // Solo jugadores. Un administrador con sesión abierta no tiene cuenta acá.
  if (!session?.user || session.user.role !== 'player') {
    redirect('/cuenta/ingresar?volver=/cuenta')
  }

  const player = await prisma.player.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, email: true, emailVerifiedAt: true, createdAt: true },
  })

  if (!player) redirect('/cuenta/ingresar')

  const nombre = player.fullName.split(' ')[0]

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="font-expanded text-3xl font-black text-white tracking-tight text-balance">
          Hola, {nombre}
        </h1>
        <p className="text-automotor-200 text-sm mt-2">Tu cuenta de Automotor Play</p>
      </div>

      {!player.emailVerifiedAt && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex gap-3">
          <MailWarning className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-amber-900">Confirmá tu correo</p>
            <p className="text-sm text-amber-800 mt-0.5">
              Te enviamos un enlace a {player.email}. Hace falta para poder entregarte un premio.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Nombre</dt>
            <dd className="text-slate-900 font-semibold">{player.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Correo</dt>
            <dd className="text-slate-900 font-semibold break-all">{player.email}</dd>
          </div>
        </dl>

        <Link
          href="/"
          className="mt-6 w-full min-h-[48px] rounded-full bg-gradient-to-r from-brand-accent-light to-brand-accent text-automotor-950 font-black flex items-center justify-center gap-1.5 transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-accent"
        >
          Ir a jugar <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </>
  )
}
