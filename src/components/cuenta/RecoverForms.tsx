// Author: Angel Colman
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MailCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const campo =
  'w-full min-h-[48px] rounded-xl border-2 border-slate-200 px-4 text-base text-slate-900 ' +
  'placeholder:text-slate-400 transition-colors focus:border-automotor-600 focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-automotor-300'
const etiqueta = 'block text-sm font-bold text-slate-700 mb-1.5'
const boton =
  'w-full min-h-[52px] rounded-full bg-gradient-to-r from-brand-accent-light to-brand-accent ' +
  'text-automotor-950 font-black text-base tracking-tight shadow-accent transition-all ' +
  'hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed flex items-center ' +
  'justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-brand-accent'

// ── Pedir el enlace ─────────────────────────────────────────────────────────

const pedirSchema = z.object({ email: z.string().trim().toLowerCase().email('Revisá el correo') })
type PedirInput = z.infer<typeof pedirSchema>

export function RequestResetForm() {
  const [enviado, setEnviado] = useState(false)
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PedirInput>({ resolver: zodResolver(pedirSchema) })

  async function onSubmit(datos: PedirInput) {
    await fetch('/api/player/password/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    }).catch(() => null)
    // Se confirma siempre igual, haya o no cuenta con ese correo.
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto mb-4 h-12 w-12 text-green-600" aria-hidden="true" />
        <h2 className="mb-2 text-xl font-black tracking-tight text-slate-900">Revisá tu correo</h2>
        <p className="text-slate-600">
          Si esa dirección tiene una cuenta, le mandamos un enlace para elegir una contraseña
          nueva. Vence en una hora.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          ¿No llegó? Mirá en spam antes de volver a pedirlo.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Poné el correo de tu cuenta y te mandamos un enlace para elegir una contraseña nueva.
      </p>
      <div>
        <label htmlFor="r-email" className={etiqueta}>Correo</label>
        <input
          id="r-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={campo}
          placeholder="juan@ejemplo.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting} className={boton}>
        {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Enviando…' : 'Enviarme el enlace'}
      </button>
    </form>
  )
}

// ── Elegir la contraseña nueva ──────────────────────────────────────────────

const nuevaSchema = z.object({
  newPassword: z.string().min(8, 'La contraseña necesita al menos 8 caracteres').max(72),
})
type NuevaInput = z.infer<typeof nuevaSchema>

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [ver, setVer] = useState(false)
  const [listo, setListo] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting },
  } = useForm<NuevaInput>({ resolver: zodResolver(nuevaSchema) })

  async function onSubmit(datos: NuevaInput) {
    setErrorGeneral(null)
    const res = await fetch('/api/player/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: datos.newPassword }),
    })
    const cuerpo = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (cuerpo?.campo === 'newPassword') setError('newPassword', { message: cuerpo.error })
      else setErrorGeneral(cuerpo?.error ?? 'No pudimos cambiar la contraseña.')
      return
    }
    setListo(true)
    setTimeout(() => router.push('/cuenta/ingresar'), 2500)
  }

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-xl font-black tracking-tight text-slate-900">Enlace incompleto</h2>
        <p className="mb-6 text-slate-600">
          Revisá que hayas copiado la dirección entera desde el correo.
        </p>
        <Link
          href="/cuenta/recuperar"
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-automotor-600 px-8 font-black text-white hover:bg-automotor-700"
        >
          Pedir otro enlace
        </Link>
      </div>
    )
  }

  if (listo) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" aria-hidden="true" />
        <h2 className="mb-2 text-xl font-black tracking-tight text-slate-900">Contraseña cambiada</h2>
        <p className="text-slate-600">Te llevamos a iniciar sesión…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="n-pass" className={etiqueta}>Contraseña nueva</label>
        <div className="relative">
          <input
            id="n-pass"
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            className={`${campo} pr-14`}
            placeholder="Al menos 8 caracteres"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
          <button
            type="button"
            onClick={() => setVer(v => !v)}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
            aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="mt-1.5 text-sm text-red-600">{errors.newPassword.message}</p>
        )}
      </div>

      {errorGeneral && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {errorGeneral}
          <Link
            href="/cuenta/recuperar"
            className="mt-1 block font-bold underline underline-offset-2"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className={boton}>
        {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
