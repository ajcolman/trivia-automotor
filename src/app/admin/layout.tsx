// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/admin/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')

  return (
    <div className="flex min-h-screen bg-slate-50">
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
