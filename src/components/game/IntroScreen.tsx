// Author: Angel Colman
'use client'

import { useState } from 'react'
import { Play, Trophy, Clock, Zap, Gift, ChevronRight, Star, ArrowLeft, BookOpen, ChevronDown } from 'lucide-react'
import type { TriviaData } from './GameShell'
import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { mediaUrl } from '@/lib/utils'

interface IntroScreenProps {
  trivia: TriviaData
  onStart: () => void
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function IntroScreen({ trivia, onStart }: IntroScreenProps) {
  const [hovered, setHovered] = useState(false)
  const [instrOpen, setInstrOpen] = useState(false)
  const logo = mediaUrl(trivia.logoUrl ?? trivia.company?.logoUrl ?? trivia.brand?.logoUrl)
  const totalPoints = trivia.questions.reduce((s, q) => s + q.points, 0)
  const maxTime = Math.max(...trivia.questions.map(q => q.timeLimit))

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4"
      style={{ backgroundColor: `${trivia.primaryColor}08` }}
    >
      {/* Back to home */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-white/60 transition-all hover:-translate-x-0.5 hover:shadow-md"
        style={{ color: trivia.primaryColor }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver al inicio
      </Link>

      <div className="w-full max-w-lg animate-fade-in-up">

        {/* ── HERO CARD ──────────────────────────────────────────── */}
        <div className="rounded-3xl shadow-2xl overflow-hidden">

          {/* Header banner */}
          <div
            className="relative px-8 pt-10 pb-8 text-white text-center overflow-hidden"
            style={{ 
              background: `linear-gradient(150deg, ${trivia.primaryColor} 0%, ${trivia.secondaryColor} 100%)`,
              minHeight: trivia.heroImageUrl ? `${trivia.heroImageSettings?.height ?? 400}px` : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            {/* Background pattern / Hero Image */}
            {trivia.heroImageUrl ? (
              <div className="absolute inset-0 pointer-events-none">
                <img 
                  src={mediaUrl(trivia.heroImageUrl)} 
                  alt="Hero" 
                  className="absolute max-w-none pointer-events-none select-none"
                  style={{
                    transform: `translate(${trivia.heroImageSettings?.x ?? 0}%, ${trivia.heroImageSettings?.y ?? 0}%) scale(${trivia.heroImageSettings?.zoom ?? 1})`,
                    transformOrigin: 'center',
                    minWidth: '100%',
                    minHeight: '100%'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
              </div>
            ) : (
              <>
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px',
                  }}
                />
                {/* Decorative glow top-right */}
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20"
                  style={{ backgroundColor: trivia.accentColor }}
                />
              </>
            )}

            <div className="relative">
              {/* Accent badge */}
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold mb-5"
                style={{ backgroundColor: `${trivia.accentColor}25`, color: trivia.accentColor, border: `1px solid ${trivia.accentColor}40` }}
              >
                <Star className="w-3 h-3 fill-current" />
                {trivia.company?.name ?? 'Trivia'}
              </div>

              {/* Logo / trophy */}
              {logo ? (
                <div className="flex justify-center mb-5">
                  <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-3">
                    <Image
                      src={logo}
                      alt="Logo"
                      width={140}
                      height={56}
                      className="h-14 w-auto object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: `${trivia.accentColor}20`, border: `2px solid ${trivia.accentColor}40` }}
                >
                  <Trophy className="w-10 h-10" style={{ color: trivia.accentColor }} />
                </div>
              )}

              <h1 className="text-3xl font-black tracking-tight leading-tight mb-2">
                {trivia.title}
              </h1>
              {trivia.description && (
                <div className="text-white/70 text-sm max-w-sm mx-auto leading-relaxed prose prose-sm prose-invert prose-p:my-1 prose-headings:text-white prose-headings:font-bold prose-a:text-white/90 max-w-none">
                  <ReactMarkdown>{trivia.description}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="bg-white p-6 space-y-5">

            {/* Game instructions (collapsible) */}
            {trivia.gameInstructions && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${trivia.primaryColor}20` }}>
                <button
                  type="button"
                  onClick={() => setInstrOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  style={{ backgroundColor: `${trivia.primaryColor}08` }}
                >
                  <span className="flex items-center gap-2 text-sm font-bold" style={{ color: trivia.primaryColor }}>
                    <BookOpen className="w-4 h-4" />
                    Instrucciones del juego
                  </span>
                  <ChevronDown
                    className="w-4 h-4 transition-transform duration-200"
                    style={{ color: trivia.primaryColor, transform: instrOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
                {instrOpen && (
                  <div
                    className="px-4 py-3 text-sm leading-relaxed border-t"
                    style={{ color: trivia.textColor, borderColor: `${trivia.primaryColor}15`, opacity: 0.85 }}
                  >
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        h1: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                        h2: ({ children }) => <h4 className="text-sm font-bold mb-2">{children}</h4>,
                        h3: ({ children }) => <h5 className="text-sm font-semibold mb-1">{children}</h5>,
                        code: ({ children }) => (
                          <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-[0.9em]">{children}</code>
                        ),
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="underline font-medium"
                            style={{ color: trivia.primaryColor }}
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {trivia.gameInstructions}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Trophy className="w-5 h-5" />, label: 'Preguntas', value: trivia.questions.length.toString() },
                { icon: <Clock className="w-5 h-5" />, label: 'Seg. / preg.', value: `${maxTime}s` },
                { icon: <Zap className="w-5 h-5" />, label: 'Pts. totales', value: totalPoints.toLocaleString() },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-3.5 text-center border"
                  style={{
                    backgroundColor: `${trivia.primaryColor}08`,
                    borderColor: `${trivia.primaryColor}20`,
                    color: trivia.primaryColor,
                  }}
                >
                  <div className="flex justify-center mb-1.5 opacity-80">{stat.icon}</div>
                  <div className="font-black text-xl leading-none mb-1">{stat.value}</div>
                  <div className="text-xs opacity-60 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Rules */}
            <div
              className="rounded-2xl p-4 space-y-2.5"
              style={{ backgroundColor: `${trivia.primaryColor}06`, border: `1px solid ${trivia.primaryColor}15` }}
            >
              {[
                { icon: '✓', bg: trivia.primaryColor, text: 'Respondé correctamente para ganar puntos.' },
                { icon: '⚡', bg: trivia.accentColor, text: <><strong>Bono de velocidad:</strong> las respuestas más rápidas suman más puntos.</> },
                { icon: 'i', bg: trivia.secondaryColor, text: 'Registrá tus datos al finalizar para guardar tu puntaje.' },
              ].map((rule, i) => (
                <p key={i} className="flex items-start gap-2.5 text-sm" style={{ color: trivia.textColor }}>
                  <span
                    className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                    style={{ backgroundColor: rule.bg }}
                  >
                    {rule.icon}
                  </span>
                  <span className="opacity-80">{rule.text}</span>
                </p>
              ))}
            </div>

            {/* Prizes */}
            {trivia.prizes.length > 0 && (
              <div
                className="rounded-2xl p-4 border"
                style={{ borderColor: `${trivia.accentColor}50`, backgroundColor: `${trivia.accentColor}08` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4" style={{ color: trivia.accentColor }} />
                  <span className="font-black text-sm" style={{ color: trivia.primaryColor }}>
                    Premios disponibles
                  </span>
                </div>
                <div className="space-y-2">
                  {trivia.prizes.slice(0, 3).map(prize => (
                    <div key={prize.id} className="flex items-center gap-2.5 text-sm">
                      <span className="text-xl">{MEDAL[prize.position] ?? '🏅'}</span>
                      <div>
                        <span className="font-bold" style={{ color: trivia.textColor }}>{prize.name}</span>
                        {prize.description && (
                          <span className="ml-1.5 text-xs opacity-50" style={{ color: trivia.textColor }}>
                            {prize.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={onStart}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="w-full py-4 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.97] shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})`,
                boxShadow: hovered
                  ? `0 12px 32px ${trivia.primaryColor}50`
                  : `0 6px 20px ${trivia.primaryColor}35`,
                transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <Play className="w-5 h-5 fill-current" />
              ¡Comenzar Trivia!
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${hovered ? 'translate-x-1' : ''}`} />
            </button>

            {trivia.company && (
              <p className="text-center text-xs opacity-30" style={{ color: trivia.textColor }}>
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
