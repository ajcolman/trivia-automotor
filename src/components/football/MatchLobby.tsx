// Author: Angel Colman
'use client'

interface MatchLobbyProps {
  matchCode: string
  player1Name: string
  player2Name: string
  player1Sprite?: string
  player2Sprite?: string
  waitingFor: 'opponent' | 'room' | 'ready'
}

function PlayerCard({
  name,
  spriteUrl,
  color,
  label,
  connected,
}: {
  name: string
  spriteUrl?: string
  color: 'blue' | 'red'
  label: string
  connected: boolean
}) {
  const borderColor = color === 'blue' ? 'border-sky-500/40' : 'border-red-500/40'
  const bgColor = color === 'blue' ? 'rgba(2,132,199,0.07)' : 'rgba(204,26,0,0.07)'
  const nameColor = color === 'blue' ? 'text-sky-300' : 'text-red-300'
  const dotColor = connected ? 'bg-green-400' : 'bg-amber-400'

  return (
    <div
      className={`flex flex-col items-center gap-3 flex-1 px-4 py-6 rounded-2xl border ${borderColor}`}
      style={{ background: bgColor }}
    >
      {/* Vehicle sprite or colored placeholder */}
      <div className="relative">
        {spriteUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={spriteUrl}
            alt={name}
            width={64}
            height={64}
            style={{ imageRendering: 'pixelated', width: 64, height: 64 }}
          />
        ) : (
          <div
            className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl border-2 ${
              color === 'blue' ? 'border-sky-600 bg-sky-900/40' : 'border-red-600 bg-red-900/40'
            }`}
            style={{ imageRendering: 'pixelated' }}
          >
            🚗
          </div>
        )}

        {/* Online indicator */}
        <span
          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${dotColor}`}
        />
      </div>

      {/* Player label */}
      <div className="text-center space-y-1">
        <p className="font-mono text-slate-500 text-xs uppercase tracking-widest">{label}</p>
        <p className={`font-mono font-bold text-sm ${nameColor}`}>{name}</p>
      </div>

      {/* Status */}
      <p className="font-mono text-xs text-slate-500">
        {connected ? '✓ Conectado' : 'Esperando...'}
      </p>
    </div>
  )
}

function StatusMessage({ waitingFor }: { waitingFor: MatchLobbyProps['waitingFor'] }) {
  if (waitingFor === 'room') {
    return (
      <div className="text-center space-y-2 py-4">
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"
              style={{ animationDelay: `${i * 75}ms` }}
            />
          ))}
        </div>
        <p className="font-mono text-amber-300 text-sm font-bold">Sala no habilitada aún</p>
        <p className="font-mono text-slate-500 text-xs">El administrador habilitará la sala en breve</p>
      </div>
    )
  }

  if (waitingFor === 'opponent') {
    return (
      <div className="text-center space-y-2 py-4">
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"
              style={{ animationDelay: `${i * 75}ms` }}
            />
          ))}
        </div>
        <p className="font-mono text-green-300 text-sm font-bold">Esperando al oponente...</p>
        <p className="font-mono text-slate-500 text-xs">Comparte el código de sala con tu oponente</p>
      </div>
    )
  }

  // ready
  return (
    <div className="text-center space-y-2 py-4">
      <div className="flex items-center justify-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse delay-75" />
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse delay-150" />
      </div>
      <p className="font-mono text-green-300 text-sm font-bold">¡Ambos conectados! Iniciando juego...</p>
    </div>
  )
}

export default function MatchLobby({
  matchCode,
  player1Name,
  player2Name,
  player1Sprite,
  player2Sprite,
  waitingFor,
}: MatchLobbyProps) {
  const p1Connected = waitingFor !== 'room'
  const p2Connected = waitingFor === 'ready'

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 px-2">
      {/* Room code */}
      <div className="text-center">
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-1">Sala</p>
        <p
          className="font-mono font-black text-2xl text-sky-300 tracking-widest"
          style={{ textShadow: '0 0 16px rgba(56,189,248,0.45)', letterSpacing: '0.18em' }}
        >
          {matchCode}
        </p>
      </div>

      {/* Players */}
      <div className="flex items-center gap-4">
        <PlayerCard
          name={player1Name}
          spriteUrl={player1Sprite}
          color="blue"
          label="Jugador 1"
          connected={p1Connected}
        />

        {/* VS */}
        <div className="flex flex-col items-center shrink-0 px-2">
          <span
            className="font-mono font-black text-2xl text-slate-500 leading-none"
            style={{ textShadow: '0 0 10px rgba(255,255,255,0.1)' }}
          >
            VS
          </span>
        </div>

        <PlayerCard
          name={player2Name}
          spriteUrl={player2Sprite}
          color="red"
          label="Jugador 2"
          connected={p2Connected}
        />
      </div>

      {/* Status */}
      <div
        className="rounded-xl border border-slate-700/40 px-4"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <StatusMessage waitingFor={waitingFor} />
      </div>

      {/* Controls hint */}
      <div className="text-center">
        <p className="font-mono text-slate-600 text-xs">Controles: WASD o teclas de dirección</p>
      </div>
    </div>
  )
}
