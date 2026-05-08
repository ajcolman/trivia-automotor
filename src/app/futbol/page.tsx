// Author: Angel Colman
import { prisma } from '@/lib/prisma'
import { RegistrationForm } from './RegistrationForm'

export const dynamic = 'force-dynamic'

interface TournamentWithCount {
  id: string
  name: string
  maxPlayers: number
  gameConfig: Record<string, unknown>
  _count: { participants: number }
}

async function getOpenTournamentsAndSprites() {
  const [tournaments, sprites] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { participants: true } } },
    }),
    prisma.vehicleSprite.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        spriteUrl: true,
        modelName: true,
        isGeneric: true,
        genericType: true,
      },
    }),
  ])
  return { tournaments, sprites }
}

function gameDuration(gameConfig: Record<string, unknown>): string {
  const val = gameConfig?.duration
  if (typeof val === 'number') return `${val} seg`
  if (typeof val === 'string') return `${val} seg`
  return '—'
}

export default async function FutbolPage() {
  const { tournaments, sprites } = await getOpenTournamentsAndSprites()

  const hasOpen = tournaments.length > 0

  return (
    <main
      className="min-h-screen text-white font-mono"
      style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #0a1628 100%)' }}
    >
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-4 text-center">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-2"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            textShadow: '0 0 20px rgba(56,189,248,0.5)',
            letterSpacing: '0.05em',
          }}
        >
          ⚽ Torneos Automotor
        </h1>
        <p className="text-slate-400 text-sm tracking-widest uppercase">
          Inscripción de jugadores
        </p>
        {/* Pixel divider */}
        <div className="mt-6 flex items-center gap-2 justify-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sky-500/40" />
          <div
            className="w-2 h-2 rotate-45 bg-sky-500"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sky-500/40" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {!hasOpen ? (
          /* No open tournaments */
          <div
            className="text-center py-20 rounded-2xl border border-slate-700/50"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="text-5xl mb-6" style={{ imageRendering: 'pixelated' }}>⏳</div>
            <p className="font-mono text-slate-300 text-lg font-bold mb-2">
              No hay torneos abiertos
            </p>
            <p className="font-mono text-slate-500 text-sm">
              en este momento
            </p>
          </div>
        ) : (
          <>
            {/* Tournament cards */}
            <div className="space-y-3">
              <p className="text-xs text-sky-400 uppercase tracking-widest">Torneos disponibles</p>
              {tournaments.map(t => {
                const filled = t._count.participants
                const pct = Math.round((filled / t.maxPlayers) * 100)
                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-slate-700/60 px-5 py-4"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono font-bold text-white text-base leading-tight">
                          {t.name}
                        </p>
                        <p className="font-mono text-slate-400 text-xs mt-1">
                          Duración: {gameDuration(t.gameConfig as Record<string, unknown>)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono text-sky-300 font-bold text-sm">
                          {filled}/{t.maxPlayers}
                        </p>
                        <p className="font-mono text-slate-500 text-xs">jugadores</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-700/60" />
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest px-2">
                Registro
              </span>
              <div className="h-px flex-1 bg-slate-700/60" />
            </div>

            {/* Registration form */}
            <div
              className="rounded-2xl border border-slate-700/60 p-6"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <RegistrationForm
                tournaments={tournaments as TournamentWithCount[]}
                sprites={sprites}
              />
            </div>
          </>
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
