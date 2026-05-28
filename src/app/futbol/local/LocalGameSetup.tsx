// Author: Angel Colman
'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

// Lazy-load GameCanvas (large client component — no SSR)
const GameCanvas = dynamic(() => import('@/components/football/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <p className="font-mono text-green-300 animate-pulse">Cargando juego...</p>
    </div>
  ),
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehicleSprite {
  id: string
  spriteUrl: string
  modelName: string | null
  isGeneric: boolean
  genericType: string | null
  brand: { name: string } | null
}

interface TournamentMatch {
  roomCode: string
  player1: { playerName: string; cedula: string }
  player2: { playerName: string; cedula: string }
}

interface Tournament {
  id: string
  name: string
  matches: TournamentMatch[]
}

interface LocalGameSetupProps {
  sprites: VehicleSprite[]
  tournaments: Tournament[]
}

type Phase = 'register' | 'playing' | 'result'

// ─── Vehicle Sprite Selector ──────────────────────────────────────────────────

function SpriteSelector({
  sprites,
  selected,
  onSelect,
  player,
}: {
  sprites: VehicleSprite[]
  selected: string
  onSelect: (id: string) => void
  player: 1 | 2
}) {
  const sel = player === 1
    ? { border: 'border-sky-400', bg: 'bg-sky-500/15', text: 'text-sky-300' }
    : { border: 'border-red-400',  bg: 'bg-red-500/15',  text: 'text-red-300' }

  return (
    <div className="grid grid-cols-3 gap-1.5 mt-2 max-h-64 overflow-y-auto pr-0.5">
      {/* "Sin vehículo" */}
      <button
        type="button"
        onClick={() => onSelect('')}
        className={`flex flex-col items-center justify-center rounded-lg border py-2 transition-all ${
          selected === ''
            ? `border-2 ${sel.border} ${sel.bg}`
            : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        <span className="font-mono text-slate-500 text-base leading-none">—</span>
        <span className="font-mono text-[8px] text-slate-600 mt-1 uppercase tracking-wide">Sin auto</span>
      </button>

      {sprites.map((sprite) => {
        const isSelected = selected === sprite.id
        const model = sprite.modelName ?? sprite.genericType ?? '?'
        const brand = sprite.brand?.name ?? ''
        return (
          <button
            key={sprite.id}
            type="button"
            onClick={() => onSelect(sprite.id)}
            className={`flex flex-col items-center rounded-lg border overflow-hidden transition-all pb-1.5 ${
              isSelected
                ? `border-2 ${sel.border} ${sel.bg}`
                : 'border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-700/40'
            }`}
          >
            {/* Sprite image */}
            <div className="w-full bg-black/20" style={{ aspectRatio: '64/40' }}>
              <img
                src={sprite.spriteUrl}
                alt={model}
                style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
            {/* Brand + model label */}
            <div className="px-1 pt-1 w-full text-center">
              {brand && (
                <p className="font-mono text-[7px] text-slate-500 uppercase tracking-widest leading-none truncate">
                  {brand}
                </p>
              )}
              <p className={`font-mono text-[8px] leading-tight mt-0.5 truncate ${isSelected ? sel.text : 'text-slate-300'}`}>
                {model}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({
  score1,
  score2,
  p1Name,
  p2Name,
  onPlayAgain,
}: {
  score1: number
  score2: number
  p1Name: string
  p2Name: string
  onPlayAgain: () => void
}) {
  const isDraw = score1 === score2
  const winnerName = score1 > score2 ? p1Name : p2Name
  const loserName = score1 > score2 ? p2Name : p1Name

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 text-center px-4">
      {/* Trophy or handshake */}
      <div className="text-6xl" style={{ imageRendering: 'pixelated' }}>
        {isDraw ? '🤝' : '🏆'}
      </div>

      <div>
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-1">
          {isDraw ? 'Empate' : 'Ganador'}
        </p>
        <h2
          className="font-mono font-black text-2xl text-sky-300"
          style={{ textShadow: '0 0 20px rgba(56,189,248,0.4)' }}
        >
          {isDraw ? 'Nadie gana' : winnerName}
        </h2>
        {!isDraw && (
          <p className="font-mono text-slate-500 text-sm mt-1">
            derrota a {loserName}
          </p>
        )}
      </div>

      {/* Score */}
      <div className="flex justify-center items-center gap-8">
        <div className="text-center">
          <p className="font-mono text-slate-500 text-xs uppercase tracking-widest">{p1Name}</p>
          <p
            className="font-mono font-black text-5xl text-sky-400 leading-none mt-1"
            style={{ textShadow: '0 0 20px rgba(56,189,248,0.4)' }}
          >
            {score1}
          </p>
        </div>
        <span className="font-mono font-black text-slate-600 text-3xl">—</span>
        <div className="text-center">
          <p className="font-mono text-slate-500 text-xs uppercase tracking-widest">{p2Name}</p>
          <p
            className="font-mono font-black text-5xl text-red-400 leading-none mt-1"
            style={{ textShadow: '0 0 20px rgba(204,26,0,0.4)' }}
          >
            {score2}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <button
          type="button"
          onClick={onPlayAgain}
          className="px-6 py-3 rounded-xl font-mono font-bold text-sm text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1a3a1a, #2d6e2d)', border: '1px solid rgba(45,142,45,0.5)' }}
        >
          ↺ Jugar de nuevo
        </button>
        <a
          href="/futbol"
          className="inline-block px-6 py-3 rounded-xl border border-sky-500/40 font-mono font-bold text-sky-300 text-sm hover:bg-sky-500/10 transition-colors"
        >
          ← Volver a torneos
        </a>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LocalGameSetup({ sprites, tournaments }: LocalGameSetupProps) {
  const [phase, setPhase] = useState<Phase>('register')

  const [p1, setP1] = useState({ playerName: '', cedula: '', vehicleId: '' })
  const [p2, setP2] = useState({ playerName: '', cedula: '', vehicleId: '' })
  const [selectedMatchCode, setSelectedMatchCode] = useState('')
  const [finalScore, setFinalScore] = useState<{ score1: number; score2: number } | null>(null)

  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

  // Flatten all matches across tournaments for the dropdown
  const allMatches: (TournamentMatch & { tournamentName: string })[] = tournaments.flatMap((t) =>
    t.matches.map((m) => ({ ...m, tournamentName: t.name }))
  )

  // Find vehicles for current players
  const p1Vehicle = sprites.find((s) => s.id === p1.vehicleId)
  const p2Vehicle = sprites.find((s) => s.id === p2.vehicleId)

  // ── Tournament match linkage ──────────────────────────────────────────────
  function handleMatchLinkChange(roomCode: string) {
    setSelectedMatchCode(roomCode)
    if (!roomCode) return

    const linked = allMatches.find((m) => m.roomCode === roomCode)
    if (!linked) return

    // Pre-fill names from linked match (cedula stays empty for user to fill)
    setP1((prev) => ({ ...prev, playerName: linked.player1.playerName }))
    setP2((prev) => ({ ...prev, playerName: linked.player2.playerName }))
  }

  // ── Match end callback ────────────────────────────────────────────────────
  const handleMatchEnd = useCallback(
    async (score1: number, score2: number) => {
      setFinalScore({ score1, score2 })
      setPhase('result')

      try {
        await fetch('/api/football/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player1: { cedula: p1.cedula, playerName: p1.playerName, vehicleId: p1.vehicleId || undefined },
            player2: { cedula: p2.cedula, playerName: p2.playerName, vehicleId: p2.vehicleId || undefined },
            scoreP1: score1,
            scoreP2: score2,
            tournamentMatchCode: selectedMatchCode || undefined,
          }),
        })
      } catch {
        // Silently fail
      }
    },
    [p1, p2, selectedMatchCode]
  )

  // ── Play again ────────────────────────────────────────────────────────────
  function handlePlayAgain() {
    setFinalScore(null)
    // Keep names pre-filled, reset phase to register
    setPhase('register')
  }

  const canStart =
    p1.playerName.trim() !== '' &&
    p1.cedula.trim() !== '' &&
    p2.playerName.trim() !== '' &&
    p2.cedula.trim() !== ''

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main
      className="min-h-screen text-white font-mono"
      style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #0a1628 100%)' }}
    >
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-4 text-center">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-2"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            textShadow: '0 0 20px rgba(56,189,248,0.5)',
            letterSpacing: '0.05em',
          }}
        >
          🎮 Modo Local
        </h1>
        <p className="text-slate-400 text-sm tracking-widest uppercase">
          Dos jugadores · misma pantalla
        </p>
        <div className="mt-6 flex items-center gap-2 justify-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sky-500/40" />
          <div className="w-2 h-2 rotate-45 bg-sky-500" style={{ imageRendering: 'pixelated' }} />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sky-500/40" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Phase: register ──────────────────────────────────────────────── */}
        {phase === 'register' && (
          <div className="space-y-6">
            {/* Tournament linkage */}
            {allMatches.length > 0 && (
              <div
                className="rounded-xl border border-slate-700/60 p-4"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                  Vincular a partido de torneo (opcional)
                </label>
                <select
                  value={selectedMatchCode}
                  onChange={(e) => handleMatchLinkChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">— Sin vincular —</option>
                  {allMatches.map((m) => (
                    <option key={m.roomCode} value={m.roomCode}>
                      {m.tournamentName} — {m.player1.playerName} vs {m.player2.playerName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Player registration grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Player 1 */}
              <div
                className="rounded-xl border border-sky-500/30 p-5 space-y-4"
                style={{ background: 'rgba(14,68,140,0.15)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-sky-400" />
                  <p className="font-mono font-bold text-sky-300 text-sm uppercase tracking-widest">
                    Jugador 1 — WASD
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={p1.playerName}
                    onChange={(e) => setP1((prev) => ({ ...prev, playerName: e.target.value }))}
                    placeholder="Nombre del jugador"
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Cédula
                  </label>
                  <input
                    type="text"
                    value={p1.cedula}
                    onChange={(e) => setP1((prev) => ({ ...prev, cedula: e.target.value }))}
                    placeholder="Número de cédula"
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Vehículo
                  </label>
                  <SpriteSelector
                    sprites={sprites}
                    selected={p1.vehicleId}
                    onSelect={(id) => setP1((prev) => ({ ...prev, vehicleId: id }))}
                    player={1}
                  />
                </div>
              </div>

              {/* Player 2 */}
              <div
                className="rounded-xl border border-red-500/30 p-5 space-y-4"
                style={{ background: 'rgba(140,14,14,0.12)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <p className="font-mono font-bold text-red-300 text-sm uppercase tracking-widest">
                    Jugador 2 — ↑↓←→
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={p2.playerName}
                    onChange={(e) => setP2((prev) => ({ ...prev, playerName: e.target.value }))}
                    placeholder="Nombre del jugador"
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Cédula
                  </label>
                  <input
                    type="text"
                    value={p2.cedula}
                    onChange={(e) => setP2((prev) => ({ ...prev, cedula: e.target.value }))}
                    placeholder="Número de cédula"
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Vehículo
                  </label>
                  <SpriteSelector
                    sprites={sprites}
                    selected={p2.vehicleId}
                    onSelect={(id) => setP2((prev) => ({ ...prev, vehicleId: id }))}
                    player={2}
                  />
                </div>
              </div>
            </div>

            {/* Controls info + Start button */}
            <div className="text-center space-y-4">
              <p className="font-mono text-slate-500 text-xs">
                P1: <span className="text-sky-400">WASD</span>
                &nbsp;·&nbsp;
                P2: <span className="text-red-400">↑↓←→</span>
                &nbsp;·&nbsp;
                Gamepad: <span className="text-green-400">automático</span>
              </p>

              <button
                type="button"
                disabled={!canStart}
                onClick={() => setPhase('playing')}
                className={`px-8 py-4 rounded-xl font-mono font-bold text-base transition-all ${
                  canStart
                    ? 'text-white hover:opacity-90 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                }`}
                style={
                  canStart
                    ? { background: 'linear-gradient(135deg, #0052cc, #0284c7)', border: '1px solid rgba(56,189,248,0.4)' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
                }
              >
                ¡Jugar!
              </button>

              {!canStart && (
                <p className="font-mono text-slate-600 text-xs">
                  Completa nombre y cédula de ambos jugadores para continuar
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Phase: playing ───────────────────────────────────────────────── */}
        {phase === 'playing' && (
          <div className="flex flex-col items-center gap-4">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-widest">
              <span className="text-sky-400">{p1.playerName} — WASD</span>
              <span className="mx-3 text-slate-600">vs</span>
              <span className="text-red-400">{p2.playerName} — ↑↓←→</span>
            </div>

            <GameCanvas
              matchCode=""
              playerId={1}
              player1Name={p1.playerName}
              player2Name={p2.playerName}
              player1SpriteUrl={p1Vehicle?.spriteUrl}
              player2SpriteUrl={p2Vehicle?.spriteUrl}
              duration={90}
              onMatchEnd={handleMatchEnd}
              mode="local"
              showTouchControls={isTouchDevice}
            />
          </div>
        )}

        {/* ── Phase: result ────────────────────────────────────────────────── */}
        {phase === 'result' && finalScore && (
          <ResultScreen
            score1={finalScore.score1}
            score2={finalScore.score2}
            p1Name={p1.playerName}
            p2Name={p2.playerName}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-12 pt-4">
        <p className="font-mono text-slate-600 text-xs tracking-widest">
          © Automotor Trivia
        </p>
      </div>
    </main>
  )
}
