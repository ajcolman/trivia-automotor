// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Trophy, Download, Share2, Medal, Star, RotateCcw, Home } from 'lucide-react'
import type { TriviaData, GameResult, AnswerRecord } from './GameShell'
import Image from 'next/image'
import Link from 'next/link'
import { mediaUrl } from '@/lib/utils'

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
const RATINGS_MULTI = [
  { min: 90, label: '¡Excelente!', emoji: '🏆', stars: 3 },
  { min: 70, label: '¡Muy bien!', emoji: '⭐', stars: 3 },
  { min: 50, label: 'Bien hecho', emoji: '👍', stars: 2 },
  { min: 0, label: '¡Podés mejorar!', emoji: '💪', stars: 1 },
]
const RATINGS_SINGLE = [
  { min: 90, label: '¡Excelente!', emoji: '🏆', stars: 3 },
  { min: 70, label: '¡Muy bien!', emoji: '⭐', stars: 3 },
  { min: 50, label: 'Bien hecho', emoji: '👍', stars: 2 },
  { min: 0, label: '¡Gracias por participar!', emoji: '💪', stars: 1 },
]

function Confetti({ color }: { color: string }) {
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${1.2 + Math.random() * 1}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 360}deg`,
    bg: i % 3 === 0 ? color : i % 3 === 1 ? '#FFD700' : '#ffffff',
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm opacity-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.bg,
            transform: `rotate(${p.rotate})`,
            animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}

interface ScoredAnswer {
  questionId: string
  chosen: number
  correct: boolean
  earnedPoints: number
  maxPoints: number
  timeTakenMs: number
  speedBonus: number
  correctAnswer: number
}

export function ResultScreen({ trivia, result }: ResultScreenProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [displayScore, setDisplayScore] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const scoredAnswers = result.scoredAnswers as ScoredAnswer[]
  const incorrectAnswers = scoredAnswers.filter(a => !a.correct)

  const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0
  const RATINGS = trivia.maxPlaysPerUser === 1 ? RATINGS_SINGLE : RATINGS_MULTI
  const rating = RATINGS.find(r => pct >= r.min) ?? RATINGS[RATINGS.length - 1]

  // Animate score counter
  useEffect(() => {
    const delay = setTimeout(() => {
      let current = 0
      const step = result.score / 50
      const t = setInterval(() => {
        current = Math.min(current + step, result.score)
        setDisplayScore(Math.round(current))
        if (current >= result.score) clearInterval(t)
      }, 25)
      return () => clearInterval(t)
    }, 400)
    return () => clearTimeout(delay)
  }, [result.score])

  // Confetti on mount for good scores
  useEffect(() => {
    if (pct >= 50) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(t)
    }
  }, [pct])

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
      logoUrl: mediaUrl(trivia.logoUrl ?? trivia.company?.logoUrl) || undefined,
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

  const logo = mediaUrl(trivia.logoUrl ?? trivia.company?.logoUrl)

  return (
    <>
      {/* Confetti keyframes */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
        @keyframes scorePop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="flex items-center justify-center min-h-screen p-4"
        style={{ backgroundColor: `${trivia.primaryColor}08` }}
      >
        <div className="w-full max-w-lg space-y-4" style={{ animation: 'fadeUp 0.5s ease both' }}>

          {/* ── SCORE CARD ─────────────────────────────────────────── */}
          <div className="rounded-3xl shadow-2xl overflow-hidden">

            {/* Hero banner */}
            <div
              className="relative px-8 pt-8 pb-6 text-white text-center overflow-hidden"
              style={{ background: `linear-gradient(150deg, ${trivia.primaryColor} 0%, ${trivia.secondaryColor} 100%)` }}
            >
              {showConfetti && <Confetti color={trivia.primaryColor} />}

              {/* Pattern */}
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
              />

              <div className="relative">
                {logo ? (
                  <div className="flex justify-center mb-4">
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-5 py-2">
                      <Image src={logo} alt="Logo" width={110} height={44} className="h-10 w-auto object-contain" unoptimized />
                    </div>
                  </div>
                ) : (
                  <Trophy className="w-14 h-14 mx-auto mb-4" style={{ color: trivia.accentColor }} />
                )}

                <div className="text-5xl mb-2" style={{ animation: showConfetti ? 'scorePop 0.6s 0.3s ease both' : undefined }}>
                  {rating.emoji}
                </div>
                <h2 className="text-2xl font-black mb-1">{rating.label}</h2>

                {/* Stars */}
                <div className="flex justify-center gap-1 mt-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5"
                      style={{
                        color: trivia.accentColor,
                        fill: i < rating.stars ? trivia.accentColor : 'transparent',
                        opacity: i < rating.stars ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Score body */}
            <div className="bg-white px-8 py-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Puntaje Final
              </p>
              <div
                className="text-7xl font-black mb-1 tabular-nums"
                style={{ color: trivia.primaryColor, fontVariantNumeric: 'tabular-nums' }}
              >
                {displayScore.toLocaleString()}
              </div>
              <p className="text-sm text-slate-400">
                de {result.maxScore.toLocaleString()} posibles — <strong className="text-slate-600">{pct}%</strong>
              </p>

              {/* Progress bar */}
              <div className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 delay-500"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${trivia.primaryColor}, ${trivia.accentColor})`,
                  }}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleDownloadCert}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-all hover:shadow-md active:scale-95"
                  style={{ borderColor: trivia.primaryColor, color: trivia.primaryColor }}
                >
                  <Download className="w-4 h-4" />
                  Certificado
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:shadow-md active:scale-95 hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                {trivia.maxPlaysPerUser > 1 && (
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Intentar de nuevo
                  </button>
                )}
                <Link
                  href="/"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Home className="w-3.5 h-3.5" />
                  Inicio
                </Link>
              </div>
            </div>
          </div>

          {/* ── INCORRECT ANSWERS SUMMARY ────────────────────────── */}
          {incorrectAnswers.length > 0 && (
            <div className="rounded-3xl overflow-hidden shadow-lg border border-red-100" style={{ animation: 'fadeUp 0.5s 0.1s ease both', opacity: 0 }}>
              <div className="px-5 py-3.5 bg-red-50 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-500" />
                <h3 className="font-black text-red-700 text-sm">Resumen de errores ({incorrectAnswers.length})</h3>
              </div>
              <div className="bg-white p-4 space-y-4">
                {incorrectAnswers.map((ans, i) => {
                  const q = trivia.questions.find(x => x.id === ans.questionId)
                  if (!q) return null
                  return (
                    <div key={ans.questionId} className="space-y-2 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                      <p className="text-sm font-bold text-slate-800 leading-tight">
                        {i + 1}. {q.question}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-100">
                          <span className="font-bold flex-shrink-0 w-4 h-4 rounded-full bg-red-200 flex items-center justify-center text-[10px]">Tu</span>
                          <span className="flex-1">{ans.chosen === -1 ? 'Sin respuesta (tiempo agotado)' : q.options[ans.chosen]}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-100">
                          <span className="font-bold flex-shrink-0 w-4 h-4 rounded-full bg-green-200 flex items-center justify-center text-[10px]">✓</span>
                          <span className="flex-1"><strong>Correcta:</strong> {q.options[ans.correctAnswer]}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── LEADERBOARD ────────────────────────────────────────── */}
          {leaderboard.length > 0 && (
            <div className="rounded-3xl overflow-hidden shadow-lg" style={{ animation: 'fadeUp 0.5s 0.2s ease both', opacity: 0 }}>
              <div
                className="px-5 py-3.5 flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
              >
                <Medal className="w-4 h-4 text-white" />
                <h3 className="font-black text-white text-sm">Tabla de Líderes</h3>
              </div>
              <div className="bg-white divide-y divide-slate-50">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.score === result.score
                  return (
                    <div
                      key={entry.position}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${isMe ? 'font-bold' : ''}`}
                      style={{ backgroundColor: isMe ? `${trivia.primaryColor}08` : 'transparent' }}
                    >
                      <span className="text-lg w-8 text-center flex-shrink-0">
                        {i < 3 ? MEDALS[i] : <span className="text-sm font-bold text-slate-400">{i + 1}</span>}
                      </span>
                      <span className="flex-1 text-sm truncate" style={{ color: trivia.textColor }}>
                        {entry.displayName}
                        {isMe && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full text-white font-bold" style={{ backgroundColor: trivia.primaryColor }}>Vos</span>}
                      </span>
                      <span className="font-black text-sm tabular-nums" style={{ color: trivia.primaryColor }}>
                        {entry.score.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 w-10 text-right tabular-nums">
                        {entry.maxScore > 0 ? `${Math.round((entry.score / entry.maxScore) * 100)}%` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-400 opacity-60">
            {trivia.company?.name ?? 'Automotor S.A.'} · Desarrollado por Angel Colman
          </p>
        </div>
      </div>
    </>
  )
}
