// Author: Angel Colman
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

type Estado = 'verificando' | 'ok' | 'error'

export function VerifyPanel() {
  const params = useSearchParams()
  const token = params.get('token')
  const [estado, setEstado] = useState<Estado>('verificando')
  const [mensaje, setMensaje] = useState('')
  // El token es de un solo uso: en desarrollo React monta dos veces y sin esto
  // el segundo intento lo encontraría ya consumido y mostraría un error falso.
  const yaEnviado = useRef(false)

  useEffect(() => {
    if (yaEnviado.current) return
    yaEnviado.current = true

    if (!token) {
      setEstado('error')
      setMensaje('El enlace está incompleto. Revisá que lo hayas copiado entero.')
      return
    }

    fetch('/api/player/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const cuerpo = await res.json().catch(() => ({}))
        if (res.ok) {
          setEstado('ok')
        } else {
          setEstado('error')
          setMensaje(cuerpo?.error ?? 'No pudimos confirmar tu cuenta.')
        }
      })
      .catch(() => {
        setEstado('error')
        setMensaje('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.')
      })
  }, [token])

  if (estado === 'verificando') {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-automotor-600 mx-auto mb-3" aria-hidden="true" />
        <p className="text-slate-600 font-semibold" role="status">Confirmando tu cuenta…</p>
      </div>
    )
  }

  if (estado === 'ok') {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Cuenta confirmada</h1>
        <p className="text-slate-600 mb-6">Ya podés jugar y competir por los premios.</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-full bg-gradient-to-r from-brand-accent-light to-brand-accent text-automotor-950 font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-accent"
        >
          Ir a jugar
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
      <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">No pudimos confirmarla</h1>
      <p className="text-slate-600 mb-6">{mensaje}</p>
      <Link
        href="/cuenta/ingresar"
        className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-full bg-automotor-600 text-white font-black hover:bg-automotor-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-automotor-600"
      >
        Iniciar sesión
      </Link>
    </div>
  )
}
