// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { playerRegisterSchema, type PlayerRegisterInput } from '@/lib/validations/player'

const campo =
  'w-full min-h-[48px] rounded-xl border-2 border-slate-200 px-4 text-base text-slate-900 ' +
  'placeholder:text-slate-400 transition-colors focus:border-automotor-600 focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-automotor-300'

const etiqueta = 'block text-sm font-bold text-slate-700 mb-1.5'

export function RegisterForm() {
  const router = useRouter()
  const [verPassword, setVerPassword] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PlayerRegisterInput>({
    resolver: zodResolver(playerRegisterSchema),
    defaultValues: { acceptedTerms: false },
  })

  async function onSubmit(datos: PlayerRegisterInput) {
    setErrorGeneral(null)

    const res = await fetch('/api/player/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
    const cuerpo = await res.json().catch(() => ({}))

    if (!res.ok) {
      // El servidor indica qué campo falló para señalarlo donde está el error.
      const campoConError = cuerpo?.campo as keyof PlayerRegisterInput | undefined
      if (campoConError) setError(campoConError, { message: cuerpo.error })
      else setErrorGeneral(cuerpo?.error ?? 'No pudimos crear la cuenta.')
      return
    }

    // Cuenta creada: iniciamos sesión sin pedirle los datos otra vez.
    const login = await signIn('player', {
      email: datos.email,
      password: datos.password,
      redirect: false,
    })

    if (login?.error) {
      router.push('/cuenta/ingresar?creada=1')
      return
    }
    router.push('/cuenta?bienvenida=1')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="fullName" className={etiqueta}>Nombre y apellido</label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          className={campo}
          placeholder="Juan Pérez"
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? 'err-fullName' : undefined}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p id="err-fullName" className="mt-1.5 text-sm text-red-600">{errors.fullName.message}</p>
        )}
      </div>

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
          aria-describedby={errors.email ? 'err-email' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="err-email" className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className={etiqueta}>Teléfono</label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={campo}
            placeholder="0981 123 456"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'err-phone' : undefined}
            {...register('phone')}
          />
          {errors.phone && (
            <p id="err-phone" className="mt-1.5 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="cedula" className={etiqueta}>Cédula</label>
          <input
            id="cedula"
            type="text"
            inputMode="numeric"
            className={campo}
            placeholder="1234567"
            aria-invalid={!!errors.cedula}
            aria-describedby={errors.cedula ? 'err-cedula' : 'ayuda-cedula'}
            {...register('cedula')}
          />
          {errors.cedula ? (
            <p id="err-cedula" className="mt-1.5 text-sm text-red-600">{errors.cedula.message}</p>
          ) : (
            <p id="ayuda-cedula" className="mt-1.5 text-xs text-slate-500">
              La usamos para entregarte el premio si ganás.
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className={etiqueta}>Contraseña</label>
        <div className="relative">
          <input
            id="password"
            type={verPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={`${campo} pr-14`}
            placeholder="Al menos 8 caracteres"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'err-password' : undefined}
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
        {errors.password && (
          <p id="err-password" className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="flex gap-3 items-start cursor-pointer py-2">
          <input
            type="checkbox"
            className="mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 border-slate-300 text-automotor-600 focus-visible:ring-2 focus-visible:ring-automotor-300"
            aria-invalid={!!errors.acceptedTerms}
            {...register('acceptedTerms')}
          />
          <span className="text-sm text-slate-600 leading-snug">
            Acepto los términos y el uso de mis datos para participar y recibir el premio si gano.
          </span>
        </label>
        {errors.acceptedTerms && (
          <p className="text-sm text-red-600">{errors.acceptedTerms.message}</p>
        )}
      </div>

      {errorGeneral && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {errorGeneral}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[52px] rounded-full bg-gradient-to-r from-brand-accent-light to-brand-accent text-automotor-950 font-black text-base tracking-tight shadow-accent transition-all hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-accent flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
      </button>
    </form>
  )
}
