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
        <div className="rounded-3xl shadow-2xl overflow-hidden text-center">
          <div
            className="p-8 text-white"
            style={{ background: `linear-gradient(135deg, var(--trivia-primary), var(--trivia-secondary))` }}
          >
            <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--trivia-accent)' }} />
            <h1 className="text-2xl font-black mb-2">¡Ya participaste!</h1>
            {trivia.maxPlaysPerUser === 1 ? (
              <p className="text-white/75 text-sm">Esta trivia solo permite una participación por persona.</p>
            ) : (
              <p className="text-white/75 text-sm">Ya alcanzaste el límite de {trivia.maxPlaysPerUser} participaciones.</p>
            )}
          </div>
          <div className="p-6" style={{ backgroundColor: 'var(--trivia-bg)' }}>
            <p className="text-sm mb-6 opacity-70" style={{ color: trivia.textColor }}>
              ¡Muchas gracias por participar con {trivia.company?.name ?? 'nosotros'}!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm"
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
