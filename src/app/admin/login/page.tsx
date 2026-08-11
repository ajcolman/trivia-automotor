// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LoginForm } from '@/components/admin/LoginForm'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  // Solo se salta el login si la sesión es de administrador. Con la sesión de
  // un jugador, mandarlo al panel provocaba un bucle: el middleware lo
  // rechazaba por rol y lo devolvía acá, que volvía a empujarlo al panel.
  const rol = (session?.user as { role?: string } | undefined)?.role
  if (session && (rol === 'admin' || rol === 'super_admin')) {
    redirect('/admin/dashboard')
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

