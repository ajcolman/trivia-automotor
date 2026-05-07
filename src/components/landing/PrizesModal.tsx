// Author: Angel Colman
'use client'

import { useState } from 'react'
import { Gift, X, Trophy } from 'lucide-react'
import Image from 'next/image'
import { mediaUrl } from '@/lib/utils'

interface Prize {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  position: number
}

interface PrizesModalProps {
  prizes: Prize[]
  primaryColor: string
  secondaryColor: string
  triviaTitle: string
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function PrizesModal({ prizes, primaryColor, secondaryColor, triviaTitle }: PrizesModalProps) {
  const [open, setOpen] = useState(false)

  if (prizes.length === 0) return null

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); setOpen(true) }}
        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all hover:opacity-80 active:scale-95"
        style={{ color: primaryColor, borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}08` }}
      >
        <Gift className="w-3 h-3" />
        Ver premios
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-6 pt-6 pb-5 text-white relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              <div className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                  <div>
                    <h2 className="font-black text-lg leading-tight">Premios en juego</h2>
                    <p className="text-white/60 text-xs">{triviaTitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Prize list */}
            <div className="bg-white max-h-[60vh] overflow-y-auto divide-y divide-slate-50">
              {prizes.map(prize => (
                <div key={prize.id} className="flex gap-4 p-4 items-start">
                  {/* Medal / position */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${primaryColor}10` }}>
                    {MEDALS[prize.position] ?? <span className="text-sm font-black text-slate-400">{prize.position}°</span>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">{prize.name}</p>
                    {prize.description && (
                      <p className="text-sm text-slate-500 mt-0.5 leading-snug">{prize.description}</p>
                    )}
                  </div>

                  {/* Image */}
                  {prize.imageUrl && (
                    <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                      <Image
                        src={mediaUrl(prize.imageUrl)}
                        alt={prize.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer CTA */}
            <div className="bg-white px-4 pb-4 pt-2 border-t border-slate-50">
              <p className="text-center text-xs text-slate-400">
                ¡Participá y ganate uno de estos premios!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
