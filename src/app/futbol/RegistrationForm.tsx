// Author: Angel Colman
'use client'

import { useState } from 'react'

interface Sprite {
  id: string
  spriteUrl: string
  modelName: string | null
  isGeneric: boolean
  genericType: string | null
}

interface Tournament {
  id: string
  name: string
  maxPlayers: number
  gameConfig: Record<string, unknown>
  _count: { participants: number }
}

interface RegistrationFormProps {
  tournaments: Tournament[]
  sprites: Sprite[]
}

export function RegistrationForm({ tournaments, sprites }: RegistrationFormProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    tournaments.length === 1 ? tournaments[0].id : '',
  )
  const [cedula, setCedula] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!selectedTournamentId) {
      setError('Seleccioná un torneo')
      return
    }
    if (!cedula.trim()) {
      setError('La cédula es requerida')
      return
    }
    if (!playerName.trim()) {
      setError('El nombre es requerido')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/football/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selectedTournamentId,
          cedula: cedula.trim(),
          playerName: playerName.trim(),
          vehicleId: selectedVehicleId || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrarse')
        return
      }

      setSuccess(true)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className="text-center py-16 px-6 rounded-2xl border-2 border-green-500/40"
        style={{ background: 'rgba(0,255,128,0.06)' }}
      >
        <div className="text-6xl mb-4" style={{ imageRendering: 'pixelated' }}>⚽</div>
        <p className="font-mono text-green-400 text-2xl font-bold mb-2">¡Registrado!</p>
        <p className="font-mono text-green-300 text-base">
          Aguardá el inicio del torneo
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tournament selector (only shown when multiple open) */}
      {tournaments.length > 1 && (
        <div className="space-y-2">
          <label className="block font-mono text-xs text-sky-400 uppercase tracking-widest">
            Torneo
          </label>
          <select
            value={selectedTournamentId}
            onChange={e => setSelectedTournamentId(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
          >
            <option value="">-- Seleccioná un torneo --</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t._count.participants}/{t.maxPlayers} jugadores)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Cedula */}
      <div className="space-y-2">
        <label className="block font-mono text-xs text-sky-400 uppercase tracking-widest">
          Cédula
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={cedula}
          onChange={e => setCedula(e.target.value.replace(/\D/g, ''))}
          placeholder="Ej: 12345678"
          required
          maxLength={20}
          className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
        />
      </div>

      {/* Player name */}
      <div className="space-y-2">
        <label className="block font-mono text-xs text-sky-400 uppercase tracking-widest">
          Nombre
        </label>
        <input
          type="text"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          placeholder="Tu nombre completo"
          required
          maxLength={200}
          className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
        />
      </div>

      {/* Vehicle selector */}
      {sprites.length > 0 && (
        <div className="space-y-3">
          <label className="block font-mono text-xs text-sky-400 uppercase tracking-widest">
            Elegí tu vehículo
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {sprites.map(sprite => (
              <button
                key={sprite.id}
                type="button"
                onClick={() => setSelectedVehicleId(sprite.id === selectedVehicleId ? '' : sprite.id)}
                title={sprite.modelName ?? sprite.genericType ?? 'Vehículo'}
                className={[
                  'relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-150 cursor-pointer',
                  selectedVehicleId === sprite.id
                    ? 'border-sky-400 bg-sky-500/20 shadow-lg shadow-sky-500/20 scale-105'
                    : 'border-slate-600 bg-slate-800/60 hover:border-slate-400 hover:bg-slate-700/60',
                ].join(' ')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sprite.spriteUrl}
                  alt={sprite.modelName ?? sprite.genericType ?? 'Sprite'}
                  width={32}
                  height={32}
                  style={{ imageRendering: 'pixelated', width: 32, height: 32 }}
                />
                {selectedVehicleId === sprite.id && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-400 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="font-mono text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full font-mono font-bold text-base py-4 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: loading ? '#1e3a5f' : 'linear-gradient(135deg, #0284c7, #0369a1)',
          color: '#fff',
          boxShadow: loading ? 'none' : '0 0 20px rgba(2,132,199,0.3)',
        }}
      >
        {loading ? 'Registrando...' : '▶ INSCRIBIRME'}
      </button>
    </form>
  )
}
