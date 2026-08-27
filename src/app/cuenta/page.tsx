// Author: Angel Colman
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ChevronRight, Pencil } from 'lucide-react'
import { LogoutButton } from '@/components/cuenta/LogoutButton'
import { VerificarAviso } from '@/components/cuenta/VerificarAviso'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Mi cuenta | Automotor Play',
  robots: { index: false, follow: false },
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: { correo?: string }
}) {
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
        <VerificarAviso email={player.email} falloElEnvio={searchParams.correo === '0'} />
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

        <Link
          href="/cuenta/editar"
          className="mt-2 w-full min-h-[48px] rounded-full border-2 border-slate-200 text-slate-700 font-bold flex items-center justify-center gap-1.5 transition-colors hover:border-automotor-400 hover:text-automotor-700 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
        >
          <Pencil className="w-4 h-4" aria-hidden="true" /> Editar mis datos
        </Link>
      </div>

      <div className="mt-4">
        <LogoutButton />
      </div>
    </>
  )
}
