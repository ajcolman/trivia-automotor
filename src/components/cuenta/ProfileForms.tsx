// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Check, Eye, EyeOff, MailWarning } from 'lucide-react'
import {
  playerProfileSchema,
  playerPasswordSchema,
  type PlayerProfileInput,
  type PlayerPasswordInput,
} from '@/lib/validations/player'

const campo =
  'w-full min-h-[48px] rounded-xl border-2 border-slate-200 px-4 text-base text-slate-900 ' +
  'placeholder:text-slate-400 transition-colors focus:border-automotor-600 focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-automotor-300'
const etiqueta = 'block text-sm font-bold text-slate-700 mb-1.5'
const boton =
  'w-full min-h-[48px] rounded-full bg-automotor-600 text-white font-black transition-colors ' +
  'hover:bg-automotor-700 disabled:opacity-60 disabled:cursor-not-allowed ' +
  'flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-automotor-600'

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
      <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" /> {children}
    </p>
  )
}

function Error_({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      {children}
    </p>
  )
}

// ── Datos personales ────────────────────────────────────────────────────────

export function ProfileForm({ inicial }: { inicial: PlayerProfileInput }) {
  const router = useRouter()
  const [ok, setOk] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PlayerProfileInput>({
    resolver: zodResolver(playerProfileSchema),
    defaultValues: inicial,
  })

  async function onSubmit(datos: PlayerProfileInput) {
    setOk(null); setErrorGeneral(null)
    const res = await fetch('/api/player/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
    const cuerpo = await res.json().catch(() => ({}))

    if (!res.ok) {
      const c = cuerpo?.campo as keyof PlayerProfileInput | undefined
      if (c) setError(c, { message: cuerpo.error })
      else setErrorGeneral(cuerpo?.error ?? 'No pudimos guardar los cambios.')
      return
    }
    setOk(
      cuerpo.verificarCorreo
        ? 'Datos guardados. Te enviamos un correo para confirmar la dirección nueva.'
        : 'Datos guardados.',
    )
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="p-fullName" className={etiqueta}>Nombre y apellido</label>
        <input id="p-fullName" type="text" autoComplete="name" className={campo}
          aria-invalid={!!errors.fullName} {...register('fullName')} />
        {errors.fullName && <p className="mt-1.5 text-sm text-red-600">{errors.fullName.message}</p>}
      </div>

      <div>
        <label htmlFor="p-email" className={etiqueta}>Correo</label>
        <input id="p-email" type="email" autoComplete="email" inputMode="email" className={campo}
          aria-invalid={!!errors.email} aria-describedby="ayuda-email" {...register('email')} />
        {errors.email
          ? <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
          : (
            <p id="ayuda-email" className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
              <MailWarning className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              Si lo cambiás, vas a tener que confirmar la dirección nueva.
            </p>
          )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-phone" className={etiqueta}>Teléfono</label>
          <input id="p-phone" type="tel" autoComplete="tel" inputMode="tel" className={campo}
            aria-invalid={!!errors.phone} {...register('phone')} />
          {errors.phone && <p className="mt-1.5 text-sm text-red-600">{errors.phone.message}</p>}
        </div>
        <div>
          <label htmlFor="p-cedula" className={etiqueta}>Cédula</label>
          <input id="p-cedula" type="text" inputMode="numeric" className={campo}
            aria-invalid={!!errors.cedula} {...register('cedula')} />
          {errors.cedula && <p className="mt-1.5 text-sm text-red-600">{errors.cedula.message}</p>}
        </div>
      </div>

      {errorGeneral && <Error_>{errorGeneral}</Error_>}
      {ok && <Aviso>{ok}</Aviso>}

      <button type="submit" disabled={isSubmitting || !isDirty} className={boton}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}

// ── Contraseña ──────────────────────────────────────────────────────────────

export function PasswordForm() {
  const [ver, setVer] = useState(false)
  const [ok, setOk] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register, handleSubmit, setError, reset,
    formState: { errors, isSubmitting },
  } = useForm<PlayerPasswordInput>({ resolver: zodResolver(playerPasswordSchema) })

  async function onSubmit(datos: PlayerPasswordInput) {
    setOk(false); setErrorGeneral(null)
    const res = await fetch('/api/player/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
    const cuerpo = await res.json().catch(() => ({}))

    if (!res.ok) {
      const c = cuerpo?.campo as keyof PlayerPasswordInput | undefined
      if (c) setError(c, { message: cuerpo.error })
      else setErrorGeneral(cuerpo?.error ?? 'No pudimos cambiar la contraseña.')
      return
    }
    setOk(true)
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="c-actual" className={etiqueta}>Contraseña actual</label>
        <input id="c-actual" type="password" autoComplete="current-password" className={campo}
          aria-invalid={!!errors.currentPassword} {...register('currentPassword')} />
        {errors.currentPassword && (
          <p className="mt-1.5 text-sm text-red-600">{errors.currentPassword.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="c-nueva" className={etiqueta}>Contraseña nueva</label>
        <div className="relative">
          <input id="c-nueva" type={ver ? 'text' : 'password'} autoComplete="new-password"
            className={`${campo} pr-14`} placeholder="Al menos 8 caracteres"
            aria-invalid={!!errors.newPassword} {...register('newPassword')} />
          <button type="button" onClick={() => setVer(v => !v)}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
            aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="mt-1.5 text-sm text-red-600">{errors.newPassword.message}</p>
        )}
      </div>

      {errorGeneral && <Error_>{errorGeneral}</Error_>}
      {ok && <Aviso>Contraseña actualizada.</Aviso>}

      <button type="submit" disabled={isSubmitting} className={boton}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Cambiando…' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
