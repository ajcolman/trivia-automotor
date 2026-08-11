// Author: Angel Colman
'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { IntroScreen } from './IntroScreen'
import { QuestionCard } from './QuestionCard'
import { LeadForm } from './LeadForm'
import { ResultScreen } from './ResultScreen'
import { AlreadyPlayed } from './AlreadyPlayed'
import { readableTextColor, readableOnGradient } from '@/lib/contrast'

export type GameState = 'intro' | 'playing' | 'form' | 'result' | 'already_played' | 'expired' | 'not_started'

export interface TriviaData {
  id: string
  title: string
  description: string | null
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  maxPlaysPerUser: number
  startDate: string | null
  endDate: string | null
  gameInstructions: string | null
  questions: QuestionData[]
  formFields: FormFieldData[]
  prizes: PrizeData[]
  heroImageUrl: string | null
  heroImageSettings: {
    zoom: number
    x: number
    y: number
    height: number
    textStroke?: number
    overlayOpacity?: number
    hideContentOnFocus?: boolean
  } | null
  company: { id: string; name: string; logoUrl: string | null } | null
  brand: { id: string; name: string; logoUrl: string | null; models: string[] } | null
  showLeaderboard: boolean
}

export interface QuestionData {
  id: string
  question: string
  options: string[]
  points: number
  timeLimit: number
  orderIndex: number
}

export interface FormFieldData {
  id: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  isRequired: boolean
  options: string[] | null
  placeholder: string | null
  orderIndex: number
}

export interface PrizeData {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  position: number
}

export interface AnswerRecord {
  questionId: string
  chosen: number
  timeMs: number
}

export interface GameResult {
  score: number
  maxScore: number
  leadId: string
  scoredAnswers: unknown[]
}

interface GameShellProps {
  trivia: TriviaData
  initialState?: GameState
}

export function GameShell({ trivia, initialState = 'intro' }: GameShellProps) {
  const [gameState, setGameState] = useState<GameState>(initialState)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [result, setResult] = useState<GameResult | null>(null)
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, string> | null>(null)

  // Salvaguarda de contraste: si quien creó la trivia eligió un textColor que
  // no se lee sobre su backgroundColor (p. ej. fondo claro con texto claro),
  // esto cae a negro o blanco -- sin tocar lo que quedó guardado en la base.
  // El resto de la app sigue viendo el trivia.textColor original tal cual.
  const safeTextColor = useMemo(
    () => readableTextColor(trivia.textColor, trivia.backgroundColor),
    [trivia.textColor, trivia.backgroundColor],
  )
  const themedTrivia = useMemo(
    () => (safeTextColor === trivia.textColor ? trivia : { ...trivia, textColor: safeTextColor }),
    [trivia, safeTextColor],
  )

  // Los encabezados van sobre el degradado primary→secondary con texto encima.
  // Dar por sentado que ese texto es blanco asume que ambos colores son
  // oscuros; con un primario claro el título se vuelve ilegible. Se evalúa
  // contra el extremo más exigente del degradado.
  const onGradient = useMemo(
    () => readableOnGradient(trivia.primaryColor, trivia.secondaryColor),
    [trivia.primaryColor, trivia.secondaryColor],
  )

  const cssVars = `
    :root {
      --trivia-primary: ${trivia.primaryColor};
      --trivia-secondary: ${trivia.secondaryColor};
      --trivia-accent: ${trivia.accentColor};
      --trivia-bg: ${trivia.backgroundColor};
      --trivia-text: ${safeTextColor};
      --trivia-on-gradient: ${onGradient};
      --trivia-on-gradient-soft: ${onGradient === '#ffffff' ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.68)'};
    }
  `

  const handleStart = useCallback(async () => {
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triviaId: trivia.id }),
      })
      const data = await res.json()
      if (!data.allowed) {
        setGameState('already_played')
        return
      }
      setGameState('playing')
      setCurrentIndex(0)
      setAnswers([])
    } catch {
      setGameState('playing')
    }
  }, [trivia.id])

  const handleAnswer = useCallback((questionId: string, chosen: number, timeMs: number) => {
    setAnswers(prev => [...prev, { questionId, chosen, timeMs }])
    if (currentIndex < trivia.questions.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setGameState('form')
    }
  }, [currentIndex, trivia.questions.length])

  const handleFormSubmit = useCallback(async (formData: Record<string, string>) => {
    const res = await fetch('/api/game/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triviaId: trivia.id, answers, formData }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al enviar')
    setResult(data)
    setSubmittedFormData(formData)
    setGameState('result')
  }, [trivia.id, answers])

  // El escenario de la plataforma es siempre el azul Automotor -- el color
  // que elige cada trivia (el "actor") vive en las tarjetas de contenido,
  // nunca en el lienzo de fondo. Así una trivia y una predicción se sienten
  // parte de la misma plataforma aunque tengan paletas distintas.
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div className="min-h-screen bg-automotor-950">
        {gameState === 'intro' && (
          <IntroScreen trivia={themedTrivia} onStart={handleStart} />
        )}
        {gameState === 'playing' && trivia.questions[currentIndex] && (
          <QuestionCard
            question={trivia.questions[currentIndex]}
            questionNumber={currentIndex + 1}
            totalQuestions={trivia.questions.length}
            currentScore={answers.reduce((s, _) => s, 0)}
            trivia={themedTrivia}
            onAnswer={handleAnswer}
          />
        )}
        {gameState === 'form' && (
          <LeadForm
            trivia={themedTrivia}
            answers={answers}
            onSubmit={handleFormSubmit}
          />
        )}
        {gameState === 'result' && result && (
          <ResultScreen
            trivia={themedTrivia}
            result={result}
            playerAnswers={answers}
            participantData={submittedFormData}
          />
        )}
        {gameState === 'already_played' && (
          <AlreadyPlayed trivia={themedTrivia} />
        )}
        {(gameState === 'expired' || gameState === 'not_started') && (
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-sm animate-fade-in-up">
              <Link
                href="/"
                className="mb-3 inline-flex min-h-[44px] items-center text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300 rounded-lg"
              >
                ← Automotor Play
              </Link>
              <div
                className="rounded-3xl p-8 text-center shadow-2xl ring-1 ring-white/10"
                style={{ backgroundColor: themedTrivia.backgroundColor }}
              >
                <div
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${themedTrivia.primaryColor}12`, color: themedTrivia.primaryColor }}
                >
                  <Clock className="h-8 w-8" />
                </div>
                <h1
                  className="font-expanded mb-3 text-2xl font-black tracking-tight"
                  style={{ color: themedTrivia.primaryColor }}
                >
                  {gameState === 'expired' ? 'Trivia finalizada' : 'Próximamente'}
                </h1>
                <p className="leading-relaxed opacity-70" style={{ color: themedTrivia.textColor }}>
                  {gameState === 'expired' ? (
                    'El periodo de participación para esta trivia ha concluido. ¡Te esperamos en la próxima!'
                  ) : (
                    <>
                      Esta trivia aún no ha comenzado.<br />
                      Vuelve el <strong>{trivia.startDate && new Date(trivia.startDate).toLocaleDateString('es-PY')}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
