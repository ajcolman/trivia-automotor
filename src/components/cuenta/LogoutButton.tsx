// Author: Angel Colman
'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { LogOut, Loader2 } from 'lucide-react'

export function LogoutButton() {
  const [saliendo, setSaliendo] = useState(false)

  return (
    <button
      type="button"
      disabled={saliendo}
      onClick={() => {
        setSaliendo(true)
        void signOut({ callbackUrl: '/' })
      }}
      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border-2 border-white/20 px-6 text-sm font-bold text-white transition-colors hover:border-white/40 hover:bg-white/5 disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
    >
      {saliendo ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      )}
      {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  )
}
