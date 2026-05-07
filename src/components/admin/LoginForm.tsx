// Author: Angel Colman
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, Lock, Mail, ChevronRight, Star, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ email: '', password: '' })

  const hasError = searchParams.get('error')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!form.email.trim()) errors.email = 'El email es obligatorio'
    if (!form.password.trim()) errors.password = 'La contraseña es obligatoria'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    setError('')
    setFieldErrors({})

    const res = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    if (res?.ok) {
      router.push('/admin/dashboard')
      router.refresh()
    } else {
      setError('Credenciales inválidas. Verifica tu email y contraseña.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col w-[45%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #001a4d 0%, #003087 50%, #0052cc 100%)' }}
      >
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #F97316, transparent)' }} />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />

        <div className="relative flex flex-col justify-between h-full px-12 py-14 text-white">
          <div>
            <Image src="/uploads/logoa.png" alt="Automotor" width={180} height={58} className="h-12 w-auto object-contain brightness-0 invert" unoptimized />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-white/70 text-xs font-semibold mb-6">
              <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" /> Grupo Automotor Paraguay
            </div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">Panel de <span style={{ color: '#F97316' }}>Administración</span></h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">Gestioná trivias, participantes, métricas y premios desde un solo lugar.</p>
          </div>
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} Automotor S.A. · Carmotor S.A.</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f4ff] p-8">
        <div className="lg:hidden mb-10">
          <Image src="/uploads/logoa.png" alt="Automotor" width={160} height={52} className="h-10 w-auto object-contain" unoptimized />
        </div>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-slate-800">Iniciar Sesión</h1>
              <p className="text-slate-500 text-sm mt-1">Ingresá tus credenciales para continuar</p>
            </div>
            {(error || hasError) && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error || 'Error al iniciar sesión. Intenta nuevamente.'}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label className={`text-sm font-semibold ${fieldErrors.email ? 'text-red-500' : 'text-slate-700'}`}>Email</Label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${fieldErrors.email ? 'text-red-400' : 'text-slate-400'}`} />
                  <Input type="email" placeholder="admin@automotor.com.py" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="pl-10 bg-slate-50 border-slate-200 h-11 rounded-xl" />
                </div>
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className={`text-sm font-semibold ${fieldErrors.password ? 'text-red-500' : 'text-slate-700'}`}>Contraseña</Label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${fieldErrors.password ? 'text-red-400' : 'text-slate-400'}`} />
                  <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="pl-10 bg-slate-50 border-slate-200 h-11 rounded-xl" />
                </div>
                {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl font-bold text-base mt-2 transition-all duration-200 text-white" style={{ background: 'linear-gradient(135deg, #003087, #0052cc)' }}>
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Iniciando sesión...</> : <span className="flex items-center gap-2">Iniciar Sesión <ChevronRight className="w-4 h-4" /></span>}
              </Button>
            </form>
          </div>
          <div className="flex items-center justify-center mt-6 gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Volver al inicio
            </Link>
            <span className="text-slate-200">·</span>
            <p className="text-slate-400 text-xs">© {new Date().getFullYear()} Automotor S.A.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
