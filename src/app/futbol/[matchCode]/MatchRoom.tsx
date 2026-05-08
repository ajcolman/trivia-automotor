// Author: Angel Colman
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import MatchLobby from '@/components/football/MatchLobby'
import { createMatchChannel } from '@/lib/football/pusher-client'

// Lazy-load GameCanvas (it's a large client component)
const GameCanvas = dynamic(() => import('@/components/football/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <p className="font-mono text-green-300 animate-pulse">Cargando juego...</p>
    </div>
  ),
})

// ─── Types ───────────────────────────────────────────────────────────────────

interface VehicleSprite {
  id: string
  spriteUrl: string
  modelName: string | null
  isGeneric: boolean
  genericType: string | null
}

interface Participant {
  id: string
  playerName: string
  cedula: string
  vehicle: VehicleSprite | null
}

interface MatchRoomProps {
  matchCode: string
  player1: Participant
  player2: Participant
  duration: number
  roomEnabled: boolean
}

type Phase = 'lobby' | 'playing' | 'finished'

// ─── Result screen ────────────────────────────────────────────────────────────

function ResultScreen({
  score1,
  score2,
  player1,
  player2,
}: {
  score1: number
  score2: number
  player1: Participant
  player2: Participant
}) {
  const isDraw = score1 === score2
  const winner = score1 > score2 ? player1 : player2
  const loser = score1 > score2 ? player2 : player1

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 text-center px-4">
      {/* Trophy or draw */}
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
          {isDraw ? 'Nadie gana' : winner.playerName}
        </h2>
        {!isDraw && (
          <p className="font-mono text-slate-500 text-sm mt-1">
            derrota a {loser.playerName}
          </p>
        )}
      </div>

      {/* Score */}
      <div className="flex justify-center items-center gap-8">
        <div className="text-center">
          <p className="font-mono text-slate-500 text-xs uppercase tracking-widest">{player1.playerName}</p>
          <p
            className="font-mono font-black text-5xl text-sky-400 leading-none mt-1"
            style={{ textShadow: '0 0 20px rgba(56,189,248,0.4)' }}
          >
            {score1}
          </p>
        </div>
        <span className="font-mono font-black text-slate-600 text-3xl">—</span>
        <div className="text-center">
          <p className="font-mono text-slate-500 text-xs uppercase tracking-widest">{player2.playerName}</p>
          <p
            className="font-mono font-black text-5xl text-red-400 leading-none mt-1"
            style={{ textShadow: '0 0 20px rgba(204,26,0,0.4)' }}
          >
            {score2}
          </p>
        </div>
      </div>

      {/* Back button */}
      <a
        href="/futbol"
        className="inline-block mt-4 px-6 py-3 rounded-xl border border-sky-500/40 font-mono font-bold text-sky-300 text-sm hover:bg-sky-500/10 transition-colors"
      >
        ← Volver a torneos
      </a>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MatchRoom({
  matchCode,
  player1,
  player2,
  duration,
  roomEnabled,
}: MatchRoomProps) {
  const [phase, setPhase] = useState<Phase>(roomEnabled ? 'lobby' : 'lobby')
  const [playerId, setPlayerId] = useState<1 | 2>(1)
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [finalScore, setFinalScore] = useState<{ score1: number; score2: number } | null>(null)
  const resultSavedRef = useRef(false)

  const p1SpriteUrl = player1.vehicle?.spriteUrl
  const p2SpriteUrl = player2.vehicle?.spriteUrl

  // ── Detect host/guest via Pusher member count ─────────────────────────────
  // We use a simple approach: the first subscription gets playerId=1 (host).
  // Pusher private channels don't expose member count, so we store a flag in
  // sessionStorage keyed by matchCode so refresh keeps the same role.
  useEffect(() => {
    if (!roomEnabled) return

    const storageKey = `football-role-${matchCode}`
    const existing = sessionStorage.getItem(storageKey)

    if (existing === '1' || existing === '2') {
      setPlayerId(existing === '1' ? 1 : 2)
    } else {
      // Determine role by subscribing and checking count
      // Default to player 1 (host); the server page could pass a role hint via URL
      // For now: first browser to load gets id=1
      setPlayerId(1)
      sessionStorage.setItem(storageKey, '1')
    }
  }, [matchCode, roomEnabled])

  // ── Listen for opponent joining ───────────────────────────────────────────
  useEffect(() => {
    if (!roomEnabled) return

    const matchChannel = createMatchChannel(matchCode, {
      onSubscriptionSucceeded: () => {
        // When we successfully subscribe, tell server we connected
        // (handled by Pusher presence in a real setup; here we watch for opponent input)
      },
      onOpponentInput: () => {
        // If we receive any input from the other player, they're connected
        if (!opponentConnected) {
          setOpponentConnected(true)
          setPhase('playing')
        }
      },
      onMatchEnd: (score1, score2) => {
        setFinalScore({ score1, score2 })
        setPhase('finished')
      },
    })

    return () => {
      matchChannel.cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchCode, roomEnabled])

  // ── Handle match end ──────────────────────────────────────────────────────
  const handleMatchEnd = useCallback(async (score1: number, score2: number) => {
    setFinalScore({ score1, score2 })
    setPhase('finished')

    if (resultSavedRef.current) return
    resultSavedRef.current = true

    try {
      await fetch(`/api/football/match/${matchCode}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreP1: score1, scoreP2: score2 }),
      })
    } catch {
      // Silently fail — result will be missing but game still ends
    }
  }, [matchCode])

  // ── Transition to playing when host starts game loop ──────────────────────
  // Host (player 1) enters playing phase immediately; guest waits for connection
  useEffect(() => {
    if (roomEnabled && playerId === 1 && phase === 'lobby') {
      // Host enters playing phase immediately — canvas starts, sends state
      setPhase('playing')
    }
  }, [roomEnabled, playerId, phase])

  // ── Lobby waitingFor state ────────────────────────────────────────────────
  const waitingFor = !roomEnabled
    ? 'room'
    : opponentConnected
      ? 'ready'
      : 'opponent'

  return (
    <div className="w-full">
      {phase === 'lobby' && (
        <MatchLobby
          matchCode={matchCode}
          player1Name={player1.playerName}
          player2Name={player2.playerName}
          player1Sprite={p1SpriteUrl}
          player2Sprite={p2SpriteUrl}
          waitingFor={waitingFor}
        />
      )}

      {phase === 'playing' && (
        <div className="flex flex-col items-center gap-4">
          {/* Role badge */}
          <div className="font-mono text-xs text-slate-500 uppercase tracking-widest">
            Eres:&nbsp;
            <span className={playerId === 1 ? 'text-sky-400' : 'text-red-400'}>
              {playerId === 1 ? player1.playerName : player2.playerName}
            </span>
          </div>

          <GameCanvas
            matchCode={matchCode}
            playerId={playerId}
            player1Name={player1.playerName}
            player2Name={player2.playerName}
            player1SpriteUrl={p1SpriteUrl}
            player2SpriteUrl={p2SpriteUrl}
            duration={duration}
            onMatchEnd={handleMatchEnd}
          />

          {/* Waiting for opponent indicator (guest only while p2 not yet seen) */}
          {playerId === 2 && !opponentConnected && (
            <p className="font-mono text-amber-400 text-xs animate-pulse">
              Esperando al oponente...
            </p>
          )}
        </div>
      )}

      {phase === 'finished' && finalScore && (
        <ResultScreen
          score1={finalScore.score1}
          score2={finalScore.score2}
          player1={player1}
          player2={player2}
        />
      )}
    </div>
  )
}
