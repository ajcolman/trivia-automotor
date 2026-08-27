// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MailWarning, Loader2, CheckCircle2 } from 'lucide-react'

type Estado = 'inicial' | 'enviando' | 'enviado' | 'error'

interface Props {
  email: string
  /** El registro avisó que el correo de bienvenida no llegó a salir. */
  falloElEnvio?: boolean
}

/**
 * Aviso de cuenta sin confirmar, con botón para pedir el enlace de nuevo.
 *
 * El botón es lo importante: sin él, quien no recibía el correo del registro
 * no tenía ninguna forma de confirmar la cuenta, y el correo confirmado es lo
 * que usamos para entregar los premios.
 */
export function VerificarAviso({ email, falloElEnvio = false }: Props) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('inicial')
  const [mensaje, setMensaje] = useState('')

  async function reenviar() {
    setEstado('enviando')
    setMensaje('')

    try {
      const res = await fetch('/api/player/verify/resend', { method: 'POST' })
      const cuerpo = await res.json().catch(() => ({}))

      if (!res.ok) {
        setEstado('error')
        setMensaje(cuerpo?.error ?? 'No pudimos enviar el correo. Probá de nuevo en unos minutos.')
        return
      }

      // Confirmó desde otra pestaña mientras tanto: el aviso ya no corresponde.
      if (cuerpo?.yaVerificado) {
        router.refresh()
        return
      }

      setEstado('enviado')
    } catch {
      setEstado('error')
      setMensaje('No pudimos enviar el correo. Revisá tu conexión y probá de nuevo.')
    }
  }

  if (estado === 'enviado') {
    return (
      <div className="mb-4 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-emerald-900">Te mandamos el enlace</p>
          <p className="mt-0.5 text-sm text-emerald-800">
            Revisá {email}, incluido el correo no deseado. El enlace vale 7 días.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <MailWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-amber-900">Confirmá tu correo</p>
        <p className="mt-0.5 text-sm text-amber-800">
          {falloElEnvio ? (
            <>
              No pudimos enviarte el enlace a <span className="break-all font-semibold">{email}</span>.
              Pedilo de nuevo acá abajo.
            </>
          ) : (
            <>
              Te enviamos un enlace a <span className="break-all font-semibold">{email}</span>. Hace
              falta para poder entregarte un premio.
            </>
          )}
        </p>

        <button
          type="button"
          onClick={reenviar}
          disabled={estado === 'enviando'}
          className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-full border-2 border-amber-300 px-4 text-sm font-bold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-100 disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {estado === 'enviando' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {estado === 'enviando' ? 'Enviando…' : 'Reenviar el enlace'}
        </button>

        {estado === 'error' && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {mensaje}
          </p>
        )}
      </div>
    </div>
  )
}
