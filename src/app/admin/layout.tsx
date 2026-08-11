// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/admin/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  // Sin sesión de administrador → se muestra el contenido pelado, que es la
  // pantalla de login. Hay dos casos de "no administrador": un jugador, que
  // también tiene sesión, y un administrador cuya ventana de 8 horas venció y
  // quedó sin rol. Los dos tienen que ver el formulario, no el panel vacío.
  const rol = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || (rol !== 'admin' && rol !== 'super_admin')) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#f0f4ff]">
      <Sidebar user={{
        name: session.user.name ?? session.user.email ?? 'Admin',
        email: session.user.email ?? '',
        role: (session.user as { role: string }).role,
      }} />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 pt-16 sm:p-5 sm:pt-20 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
