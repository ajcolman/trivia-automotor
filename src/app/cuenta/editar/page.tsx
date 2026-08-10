// Author: Angel Colman
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm, PasswordForm } from '@/components/cuenta/ProfileForms'

export const metadata: Metadata = {
  title: 'Editar mis datos | Automotor Play',
  robots: { index: false, follow: false },
}

export default async function EditarPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'player') {
    redirect('/cuenta/ingresar?volver=/cuenta/editar')
  }

  const player = await prisma.player.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, email: true, phone: true, cedula: true },
  })
  if (!player) redirect('/cuenta/ingresar')

  return (
    <>
      <Link
        href="/cuenta"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-automotor-200 transition-colors hover:text-white motion-reduce:transition-none"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Mi cuenta
      </Link>

      <h1 className="font-expanded mb-5 text-2xl font-black tracking-tight text-white">
        Editar mis datos
      </h1>

      <section className="rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-400">
          Datos personales
        </h2>
        <ProfileForm
          inicial={{
            fullName: player.fullName,
            email: player.email,
            phone: player.phone,
            cedula: player.cedula ?? '',
          }}
        />
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-400">
          Contraseña
        </h2>
        <PasswordForm />
      </section>
    </>
  )
}
