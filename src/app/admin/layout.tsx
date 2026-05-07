// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/admin/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  // No session → render bare (only /admin/login reaches here unauthenticated;
  // middleware blocks everything else and redirects to /admin/login).
  if (!session?.user) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-[#f0f4ff]">
      <Sidebar user={{
        name: session.user.name ?? session.user.email ?? 'Admin',
        email: session.user.email ?? '',
        role: (session.user as { role: string }).role,
      }} />
      <main className="flex-1 overflow-x-hidden">
        <div className="lg:p-8 p-4 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
