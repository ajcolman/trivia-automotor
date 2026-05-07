// Author: Angel Colman
'use client'

import { useState, useCallback } from 'react'
import { IntroScreen } from './IntroScreen'
import { QuestionCard } from './QuestionCard'
import { LeadForm } from './LeadForm'
import { ResultScreen } from './ResultScreen'
import { AlreadyPlayed } from './AlreadyPlayed'

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
  questions: QuestionData[]
  formFields: FormFieldData[]
  prizes: PrizeData[]
  company: { id: string; name: string; logoUrl: string | null } | null
  brand: { id: string; name: string; logoUrl: string | null; models: string[] } | null
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

  const cssVars = `
    :root {
      --trivia-primary: ${trivia.primaryColor};
      --trivia-secondary: ${trivia.secondaryColor};
      --trivia-accent: ${trivia.accentColor};
      --trivia-bg: ${trivia.backgroundColor};
      --trivia-text: ${trivia.textColor};
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
    try {
      const res = await fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triviaId: trivia.id, answers, formData }),
      })
      const data = await res.json()
      setResult(data)
      setGameState('result')
    } catch {
      setGameState('result')
    }
  }, [trivia.id, answers])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div
        className="min-h-screen transition-colors duration-300"
        style={{ backgroundColor: trivia.backgroundColor, color: trivia.textColor }}
      >
        {gameState === 'intro' && (
          <IntroScreen trivia={trivia} onStart={handleStart} />
        )}
        {gameState === 'playing' && trivia.questions[currentIndex] && (
          <QuestionCard
            question={trivia.questions[currentIndex]}
            questionNumber={currentIndex + 1}
            totalQuestions={trivia.questions.length}
            currentScore={answers.reduce((s, _) => s, 0)}
            trivia={trivia}
            onAnswer={handleAnswer}
          />
        )}
        {gameState === 'form' && (
          <LeadForm
            trivia={trivia}
            answers={answers}
            onSubmit={handleFormSubmit}
          />
        )}
        {gameState === 'result' && result && (
          <ResultScreen
            trivia={trivia}
            result={result}
            playerAnswers={answers}
          />
        )}
        {gameState === 'already_played' && (
          <AlreadyPlayed trivia={trivia} />
        )}
        {gameState === 'expired' && (
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="text-center bg-white p-10 rounded-3xl shadow-xl max-w-sm w-full">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                <Clock className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-black mb-3" style={{ color: trivia.primaryColor }}>
                Trivia Finalizada
              </h1>
              <p className="text-slate-500 leading-relaxed">
                El periodo de participación para esta trivia ha concluido. ¡Te esperamos en la próxima!
              </p>
            </div>
          </div>
        )}
        {gameState === 'not_started' && (
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="text-center bg-white p-10 rounded-3xl shadow-xl max-w-sm w-full">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                <Clock className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-black mb-3" style={{ color: trivia.primaryColor }}>
                Próximamente
              </h1>
              <p className="text-slate-500 leading-relaxed">
                Esta trivia aún no ha comenzado.<br/>
                Vuelve el <strong>{new Date(trivia.startDate!).toLocaleDateString('es-PY')}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
