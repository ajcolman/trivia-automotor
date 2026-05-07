// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Trophy, Download, Share2, Medal } from 'lucide-react'
import type { TriviaData, GameResult, AnswerRecord } from './GameShell'
import Image from 'next/image'

interface LeaderboardEntry {
  position: number
  displayName: string
  score: number
  maxScore: number
  completedAt: string
}

interface ResultScreenProps {
  trivia: TriviaData
  result: GameResult
  playerAnswers: AnswerRecord[]
}

const MEDALS = ['🥇', '🥈', '🥉']
const RATINGS = [
  { min: 90, label: '¡Excelente!', color: '#22c55e', emoji: '🏆' },
  { min: 70, label: '¡Muy bien!', color: '#3b82f6', emoji: '⭐' },
  { min: 50, label: 'Bien hecho', color: '#f59e0b', emoji: '👍' },
  { min: 0, label: 'Sigue participando', color: '#6b7280', emoji: '💪' },
]

export function ResultScreen({ trivia, result }: ResultScreenProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [displayScore, setDisplayScore] = useState(0)

  const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0
  const rating = RATINGS.find(r => pct >= r.min) ?? RATINGS[RATINGS.length - 1]

  // Animate score
  useEffect(() => {
    let current = 0
    const step = result.score / 40
    const t = setInterval(() => {
      current = Math.min(current + step, result.score)
      setDisplayScore(Math.round(current))
      if (current >= result.score) clearInterval(t)
    }, 30)
    return () => clearInterval(t)
  }, [result.score])

  // Fetch leaderboard
  useEffect(() => {
    fetch(`/api/game/leaderboard/${trivia.id}`)
      .then(r => r.json())
      .then(setLeaderboard)
      .catch(() => {})
  }, [trivia.id])

  const handleDownloadCert = async () => {
    const { generateCertificate } = await import('@/lib/certificate-generator')
    await generateCertificate({
      playerName: 'Participante',
      triviaTitle: trivia.title,
      score: result.score,
      maxScore: result.maxScore,
      date: new Date().toLocaleDateString('es-PY'),
      companyName: trivia.company?.name,
      logoUrl: trivia.logoUrl ?? trivia.company?.logoUrl ?? undefined,
    })
  }

  const handleShare = () => {
    const text = `Obtuve ${result.score} puntos en la trivia "${trivia.title}" 🏆`
    if (navigator.share) {
      navigator.share({ title: trivia.title, text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(`${text} ${window.location.href}`)
    }
  }

  const logo = trivia.logoUrl ?? trivia.company?.logoUrl

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-lg animate-fade-in-up space-y-4">
        {/* Score card */}
        <div className="rounded-3xl shadow-2xl overflow-hidden">
          <div
            className="p-8 text-white text-center"
            style={{ background: `linear-gradient(135deg, var(--trivia-primary), var(--trivia-secondary))` }}
          >
            {logo ? (
              <Image src={logo} alt="Logo" width={100} height={40} className="h-10 w-auto object-contain mx-auto mb-4" unoptimized />
            ) : (
              <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--trivia-accent)' }} />
            )}
            <div className="text-6xl mb-2">{rating.emoji}</div>
            <h2 className="text-2xl font-black mb-1">{rating.label}</h2>
          </div>

          <div className="p-6 text-center" style={{ backgroundColor: 'var(--trivia-bg)' }}>
            <p className="text-sm font-semibold uppercase tracking-widest mb-1 opacity-50" style={{ color: trivia.textColor }}>
              Puntaje Total
            </p>
            <div className="text-7xl font-black mb-1" style={{ color: trivia.primaryColor }}>
              {displayScore}
            </div>
            <p className="text-sm opacity-50" style={{ color: trivia.textColor }}>
              de {result.maxScore} posibles ({pct}%)
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-3 rounded-full overflow-hidden" style={{ backgroundColor: `${trivia.primaryColor}20` }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${pct}%`, backgroundColor: rating.color }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleDownloadCert}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-all hover:opacity-80"
                style={{ borderColor: trivia.primaryColor, color: trivia.primaryColor }}
              >
                <Download className="w-4 h-4" />
                Certificado
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-80"
                style={{ backgroundColor: trivia.primaryColor }}
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="rounded-3xl shadow-lg overflow-hidden">
            <div
              className="p-4 flex items-center gap-2"
              style={{ backgroundColor: trivia.primaryColor }}
            >
              <Medal className="w-5 h-5 text-white" />
              <h3 className="font-black text-white">Top 10 - {trivia.title}</h3>
            </div>
            <div style={{ backgroundColor: 'var(--trivia-bg)' }}>
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.position}
                  className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 ${entry.score === result.score ? 'font-bold' : ''}`}
                  style={{
                    borderColor: `${trivia.primaryColor}10`,
                    backgroundColor: entry.score === result.score ? `${trivia.primaryColor}10` : 'transparent',
                  }}
                >
                  <span className="text-lg w-8 text-center">
                    {i < 3 ? MEDALS[i] : `${i + 1}.`}
                  </span>
                  <span className="flex-1 text-sm" style={{ color: trivia.textColor }}>
                    {entry.displayName}
                  </span>
                  <span className="font-black" style={{ color: trivia.primaryColor }}>
                    {entry.score}
                  </span>
                  <span className="text-xs opacity-50" style={{ color: trivia.textColor }}>
                    {entry.maxScore > 0 ? `${Math.round((entry.score / entry.maxScore) * 100)}%` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs opacity-30" style={{ color: trivia.textColor }}>
          Desarrollado por Angel Colman · {trivia.company?.name ?? 'Automotor S.A.'}
        </p>
      </div>
    </div>
  )
}
