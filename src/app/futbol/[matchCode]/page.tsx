// Author: Angel Colman
import { notFound } from 'next/navigation'
import MatchRoom from './MatchRoom'

export const dynamic = 'force-dynamic'

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

interface Tournament {
  id: string
  name: string
  gameConfig: Record<string, unknown>
}

interface Match {
  id: string
  round: number
  status: 'waiting' | 'playing' | 'finished'
  roomCode: string
  scheduledAt: string | null
  roomEnabledAt: string | null
  scoreP1: number
  scoreP2: number
  tournament: Tournament
  player1: Participant
  player2: Participant
}

async function getMatch(code: string): Promise<Match | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/football/match/${code}`, {
      cache: 'no-store',
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Montevideo',
  })
}

export default async function MatchRoomPage({
  params,
}: {
  params: { matchCode: string }
}) {
  const match = await getMatch(params.matchCode)

  if (!match) {
    notFound()
  }

  const roomEnabled = !!match.roomEnabledAt

  // Extract game duration from tournament config (default 90s)
  const gameConfig = match.tournament.gameConfig as { duration?: number }
  const duration = typeof gameConfig?.duration === 'number' ? gameConfig.duration : 90

  return (
    <main
      className="min-h-screen text-white font-mono"
      style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #0a1628 100%)' }}
    >
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-4 text-center">
        <p className="text-xs text-sky-400 uppercase tracking-widest mb-1">
          {match.tournament.name}
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            textShadow: '0 0 20px rgba(56,189,248,0.4)',
          }}
        >
          ⚽ Ronda {match.round}
        </h1>

        {/* Pixel divider */}
        <div className="mt-5 flex items-center gap-2 justify-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sky-500/40" />
          <div className="w-2 h-2 rotate-45 bg-sky-500" style={{ imageRendering: 'pixelated' }} />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sky-500/40" />
        </div>
      </div>

      {/* Match info bar */}
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <div
          className="rounded-xl border border-slate-700/50 px-5 py-3 flex flex-wrap gap-4 justify-between items-center text-xs"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-widest">Sala</span>
            <span className="text-slate-300 font-bold">{match.roomCode}</span>
          </div>
          {match.scheduledAt && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase tracking-widest">Programado</span>
              <span className="text-slate-300">{formatDateTime(match.scheduledAt)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-widest">Estado</span>
            <span
              className={[
                'font-bold uppercase',
                match.status === 'playing'
                  ? 'text-green-400'
                  : match.status === 'finished'
                    ? 'text-slate-400'
                    : 'text-amber-400',
              ].join(' ')}
            >
              {match.status === 'waiting'
                ? 'En espera'
                : match.status === 'playing'
                  ? 'Jugando'
                  : 'Finalizado'}
            </span>
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <MatchRoom
          matchCode={match.roomCode}
          player1={match.player1}
          player2={match.player2}
          duration={duration}
          roomEnabled={roomEnabled}
        />
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="font-mono text-slate-600 text-xs tracking-widest">
          © Automotor Trivia
        </p>
      </div>
    </main>
  )
}
