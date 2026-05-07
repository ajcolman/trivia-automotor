// Author: Angel Colman
'use client'

import { Play, Trophy, Clock, Zap, Gift } from 'lucide-react'
import type { TriviaData } from './GameShell'
import Image from 'next/image'

interface IntroScreenProps {
  trivia: TriviaData
  onStart: () => void
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function IntroScreen({ trivia, onStart }: IntroScreenProps) {
  const logo = trivia.logoUrl ?? trivia.company?.logoUrl ?? trivia.brand?.logoUrl

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-lg animate-fade-in-up">
        {/* Card */}
        <div className="rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div
            className="p-8 text-white text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, var(--trivia-primary), var(--trivia-secondary))` }}
          >
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
            />
            {logo ? (
              <div className="flex justify-center mb-4">
                <Image src={logo} alt="Logo" width={120} height={48} className="object-contain h-12 w-auto" unoptimized />
              </div>
            ) : (
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-90" style={{ color: 'var(--trivia-accent)' }} />
            )}
            <h1 className="text-3xl font-black mb-2 tracking-tight">{trivia.title}</h1>
            {trivia.description && (
              <p className="text-white/80 text-sm mt-2 max-w-sm mx-auto">{trivia.description}</p>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-4" style={{ backgroundColor: 'var(--trivia-bg)' }}>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Trophy className="w-5 h-5" />, label: 'Preguntas', value: trivia.questions.length.toString() },
                { icon: <Clock className="w-5 h-5" />, label: 'Máx. seg.', value: `${Math.max(...trivia.questions.map(q => q.timeLimit))}s` },
                { icon: <Zap className="w-5 h-5" />, label: 'Puntos', value: `${trivia.questions.reduce((s, q) => s + q.points, 0)}` },
              ].map((stat, i) => (
                <div key={i}
                  className="rounded-2xl p-3 text-center"
                  style={{ backgroundColor: `${trivia.primaryColor}15`, color: trivia.primaryColor }}
                >
                  <div className="flex justify-center mb-1">{stat.icon}</div>
                  <div className="font-bold text-lg">{stat.value}</div>
                  <div className="text-xs opacity-70">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Rules */}
            <div className="text-sm space-y-2" style={{ color: trivia.textColor }}>
              <p className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: trivia.primaryColor }}>✓</span>
                Responde correctamente para ganar puntos.
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: trivia.accentColor }}>⚡</span>
                <strong>Bono de velocidad:</strong> las respuestas más rápidas suman más puntos.
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: trivia.secondaryColor }}>i</span>
                Registra tus datos al finalizar para guardar tu puntaje.
              </p>
            </div>

            {/* Prizes */}
            {trivia.prizes.length > 0 && (
              <div className="rounded-2xl p-4 border" style={{ borderColor: `${trivia.accentColor}60`, backgroundColor: `${trivia.accentColor}10` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4" style={{ color: trivia.accentColor }} />
                  <span className="font-bold text-sm" style={{ color: trivia.primaryColor }}>Premios disponibles</span>
                </div>
                <div className="space-y-2">
                  {trivia.prizes.slice(0, 3).map(prize => (
                    <div key={prize.id} className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{MEDAL[prize.position] ?? '🏅'}</span>
                      <div>
                        <span className="font-semibold" style={{ color: trivia.textColor }}>{prize.name}</span>
                        {prize.description && (
                          <span className="ml-2 opacity-60" style={{ color: trivia.textColor }}>{prize.description}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start button */}
            <button
              onClick={onStart}
              className="w-full py-4 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-3 transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-lg"
              style={{ background: `linear-gradient(135deg, var(--trivia-primary), var(--trivia-secondary))` }}
            >
              <Play className="w-5 h-5 fill-current" />
              ¡Comenzar Trivia!
            </button>

            {trivia.company && (
              <p className="text-center text-xs opacity-40" style={{ color: trivia.textColor }}>
                {trivia.company.name}
                {trivia.brand ? ` · ${trivia.brand.name}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
