// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LoginForm } from '@/components/admin/LoginForm'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/admin/dashboard')
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

