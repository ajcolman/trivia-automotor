// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export type AuthResult =
  | { session: { user: { id: string; role: string; email: string; name: string } }; error: null }
  | { session: null; error: NextResponse }

export async function requireAuth(superAdminOnly = false): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  if (superAdminOnly && session.user.role !== 'super_admin') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    }
  }

  return { session: session as any, error: null }
}

export function isSuperAdmin(role: string) {
  return role === 'super_admin'
}
