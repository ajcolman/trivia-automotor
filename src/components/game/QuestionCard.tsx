// Author: Angel Colman
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import type { TriviaData, QuestionData } from './GameShell'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

interface QuestionCardProps {
  question: QuestionData
  questionNumber: number
  totalQuestions: number
  currentScore: number
  trivia: TriviaData
  onAnswer: (questionId: string, chosen: number, timeMs: number) => void
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  trivia,
  onAnswer,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(question.timeLimit)
  const [pointsFlash, setPointsFlash] = useState<string | null>(null)
  const [serverCorrectAnswer, setServerCorrectAnswer] = useState<number | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setSelected(null)
    setIsAnswered(false)
    setTimeLeft(question.timeLimit)
    setPointsFlash(null)
    setServerCorrectAnswer(null)
    setIsValidating(false)
    startTimeRef.current = Date.now()
  }, [question.id, question.timeLimit])

  const doAnswer = useCallback(async (index: number) => {
    if (isAnswered || isValidating) return
    const elapsed = Date.now() - startTimeRef.current
    setSelected(index)
    setIsAnswered(true)
    setIsValidating(true)
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      const res = await fetch('/api/game/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, chosen: index })
      })
      const data = await res.json()
      
      setServerCorrectAnswer(data.correctAnswer)
      setIsValidating(false)

      if (data.correct) {
        const ratio = Math.min(elapsed / (question.timeLimit * 1000), 1)
        const pts = Math.round(question.points * (1 - ratio * 0.5))
        setPointsFlash(`+${pts}`)
      } else {
        setPointsFlash('0')
      }

      setTimeout(() => onAnswer(question.id, index, elapsed), 2000)
    } catch (error) {
      console.error('Validation error:', error)
      // Fallback: move on without feedback if API fails
      onAnswer(question.id, index, elapsed)
    }
  }, [isAnswered, isValidating, question, onAnswer])

  // Timer
  useEffect(() => {
    if (isAnswered) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          doAnswer(-1)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [question.id, isAnswered, doAnswer])

  const pct = (timeLeft / question.timeLimit) * 100
  const timerColor = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl animate-fade-in-up">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm font-semibold opacity-60" style={{ color: trivia.textColor }}>
            {questionNumber} / {totalQuestions}
          </span>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${timeLeft <= 5 && !isAnswered ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: `${timerColor}20`, color: timerColor }}
          >
            <Clock className="w-4 h-4" />
            {timeLeft}s
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ backgroundColor: `${trivia.primaryColor}20` }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%`, backgroundColor: timerColor }}
          />
        </div>

        {/* Question */}
        <div
          className="rounded-3xl p-6 mb-4 shadow-lg relative"
          style={{ backgroundColor: 'white' }}
        >
          <p className="text-xl font-bold leading-relaxed" style={{ color: trivia.textColor }}>
            {question.question}
          </p>
          {pointsFlash && (
            <div
              className={`absolute top-4 right-4 text-2xl font-black animate-bounce ${pointsFlash.startsWith('+') ? '' : 'opacity-60'}`}
              style={{ color: pointsFlash.startsWith('+') ? trivia.accentColor : '#ef4444' }}
            >
              {pointsFlash.startsWith('+') ? pointsFlash : 'Incorrecto'} {pointsFlash.startsWith('+') ? 'pts' : ''}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(question.options as string[]).map((option, idx) => {
            let bg = 'white'
            let border = `${trivia.primaryColor}30`
            let textColor = trivia.textColor
            let icon = null

            if (isAnswered && serverCorrectAnswer !== null) {
              const isCorrect = idx === serverCorrectAnswer
              const isSelected = idx === selected

              if (isCorrect) {
                bg = '#f0fdf4'
                border = '#22c55e'
                textColor = '#166534'
                icon = <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              } else if (isSelected) {
                bg = '#fef2f2'
                border = '#ef4444'
                textColor = '#991b1b'
                icon = <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              } else {
                textColor = '#9ca3af'
                border = '#e5e7eb'
                bg = '#f9fafb'
              }
            } else if (isAnswered && isValidating && idx === selected) {
              // Show loading state for the selected option
              bg = '#f8fafc'
              border = trivia.primaryColor
              icon = <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => doAnswer(idx)}
                className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-200 border-2 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default font-medium"
                style={{ backgroundColor: bg, borderColor: border, color: textColor }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{
                    backgroundColor: isAnswered ? 'transparent' : `${trivia.primaryColor}15`,
                    color: isAnswered ? 'inherit' : trivia.primaryColor,
                  }}
                >
                  {LETTERS[idx]}
                </span>
                <span className="flex-1">{option}</span>
                {icon}
              </button>
            )
          })}
        </div>

        {isAnswered && selected === -1 && (
          <div className="mt-4 text-center text-red-500 font-semibold animate-bounce">
            ⏰ ¡Se acabó el tiempo!
          </div>
        )}
      </div>
    </div>
  )
}
