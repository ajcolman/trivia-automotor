// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export type AuthResult =
  | { session: { user: { id: string; role: string; email: string; name: string } }; error: null }
  | { session: null; error: NextResponse }

const ADMIN_ROLES = ['admin', 'super_admin']

export async function requireAuth(superAdminOnly = false): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  // Tener sesión no alcanza: los jugadores también tienen una. El middleware
  // cubre las páginas /admin, pero no las rutas /api/admin, así que el rol se
  // exige acá o cualquier cliente registrado entraría a la API del panel.
  if (!ADMIN_ROLES.includes(session.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }),
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
