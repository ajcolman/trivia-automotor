// Author: Angel Colman
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trophy, Loader2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  const hasError = searchParams.get('error')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Automotor Trivia</h1>
          <p className="text-slate-400 text-sm mt-1">Panel de Administración</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-6">Iniciar Sesión</h2>

          {(error || hasError) && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error || 'Error al iniciar sesión. Intenta nuevamente.'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Email</Label>
              <Input
                type="email"
                placeholder="admin@automotor.com.py"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Contraseña</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 mt-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Iniciando sesión...</>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2025 Automotor S.A. · Desarrollado por <strong className="text-slate-400">Angel Colman</strong>
        </p>
      </div>
    </div>
  )
}
