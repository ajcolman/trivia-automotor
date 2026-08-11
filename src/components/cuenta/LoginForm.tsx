// Author: Angel Colman
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import { playerLoginSchema } from '@/lib/validations/player'

type Datos = z.infer<typeof playerLoginSchema>

const campo =
  'w-full min-h-[48px] rounded-xl border-2 border-slate-200 px-4 text-base text-slate-900 ' +
  'placeholder:text-slate-400 transition-colors focus:border-automotor-600 focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-automotor-300'

const etiqueta = 'block text-sm font-bold text-slate-700 mb-1.5'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [verPassword, setVerPassword] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const reciénCreada = params.get('creada') === '1'
  const destino = params.get('volver') ?? '/cuenta'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(playerLoginSchema) })

  async function onSubmit(datos: Datos) {
    setErrorGeneral(null)
    const res = await signIn('player', { ...datos, redirect: false })

    if (res?.error) {
      // Mensaje único a propósito: decir cuál de los dos está mal revelaría
      // qué correos tienen cuenta.
      setErrorGeneral('Correo o contraseña incorrectos.')
      return
    }
    router.push(destino)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {reciénCreada && (
        <p className="flex gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          Tu cuenta está creada. Iniciá sesión para empezar.
        </p>
      )}

      <div>
        <label htmlFor="email" className={etiqueta}>Correo</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={campo}
          placeholder="juan@ejemplo.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
      </div>

      <div>
        <label htmlFor="password" className={etiqueta}>Contraseña</label>
        <div className="relative">
          <input
            id="password"
            type={verPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className={`${campo} pr-14`}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setVerPassword(v => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
            aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {verPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {errorGeneral && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {errorGeneral}
        </p>
      )}

      <p className="text-right">
        <Link
          href="/cuenta/recuperar"
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-automotor-600 hover:text-automotor-700 hover:underline underline-offset-2"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[52px] rounded-full bg-gradient-to-r from-brand-accent-light to-brand-accent text-automotor-950 font-black text-base tracking-tight shadow-accent transition-all hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-accent flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
