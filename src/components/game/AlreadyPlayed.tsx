// Author: Angel Colman
'use client'

import { AlertCircle, Trophy } from 'lucide-react'
import type { TriviaData } from './GameShell'
import Link from 'next/link'

interface AlreadyPlayedProps {
  trivia: TriviaData
}

export function AlreadyPlayed({ trivia }: AlreadyPlayedProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="rounded-3xl shadow-2xl ring-1 ring-white/10 overflow-hidden text-center">
          <div
            className="p-8"
            style={{ background: `linear-gradient(135deg, var(--trivia-primary), var(--trivia-secondary))`, color: 'var(--trivia-on-gradient)', }}
          >
            <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--trivia-accent)' }} />
            <h1 className="font-expanded text-2xl font-black mb-2">¡Ya participaste!</h1>
            {trivia.maxPlaysPerUser === 1 ? (
              <p className="text-sm" style={{ color: 'var(--trivia-on-gradient-soft)' }}>Esta trivia solo permite una participación por persona.</p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--trivia-on-gradient-soft)' }}>Ya alcanzaste el límite de {trivia.maxPlaysPerUser} participaciones.</p>
            )}
          </div>
          <div className="p-6" style={{ backgroundColor: 'var(--trivia-bg)' }}>
            <p className="text-sm mb-6 opacity-70" style={{ color: trivia.textColor }}>
              ¡Muchas gracias por participar con {trivia.company?.name ?? 'nosotros'}!
            </p>
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300 focus-visible:ring-offset-2"
              style={{ backgroundColor: trivia.primaryColor }}
            >
              <Trophy className="w-4 h-4" />
              Ver otras trivias
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
