// Author: Angel Colman
'use client'

import { useState } from 'react'
import type { PlayerInput } from '@/lib/football/physics'

interface VirtualDpadProps {
  playerId: 1 | 2
  side: 'left' | 'right'
  onInput: (partial: Partial<PlayerInput>) => void
}

type Direction = 'up' | 'down' | 'left' | 'right'

const ARROW_SYMBOLS: Record<Direction, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
}

// Grid position: [col, row] (0-indexed, 3×3 grid)
const DIR_POSITIONS: Record<Direction, [number, number]> = {
  up:    [1, 0],
  down:  [1, 2],
  left:  [0, 1],
  right: [2, 1],
}

export default function VirtualDpad({ playerId, side, onInput }: VirtualDpadProps) {
  const [pressed, setPressed] = useState<Partial<Record<Direction, boolean>>>({})

  if (typeof window === 'undefined' || !('ontouchstart' in window)) {
    return null
  }

  const positionClass = side === 'left' ? 'left-4' : 'right-4'

  const activeBase = playerId === 1
    ? 'bg-sky-600/80 border-sky-400'
    : 'bg-red-600/80 border-red-400'

  const handlePointerDown = (dir: Direction) => (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setPressed(prev => ({ ...prev, [dir]: true }))
    onInput({ [dir]: true })
  }

  const handlePointerUp = (dir: Direction) => (e: React.PointerEvent) => {
    e.preventDefault()
    setPressed(prev => ({ ...prev, [dir]: false }))
    onInput({ up: false, down: false, left: false, right: false })
  }

  const directions: Direction[] = ['up', 'down', 'left', 'right']

  return (
    <div
      className={`fixed bottom-6 ${positionClass} z-50`}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-black/20 backdrop-blur-sm p-1 rounded-xl">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 48px)',
            gridTemplateRows: 'repeat(3, 48px)',
            gap: 2,
          }}
        >
          {directions.map((dir) => {
            const [col, row] = DIR_POSITIONS[dir]
            const isActive = !!pressed[dir]

            return (
              <button
                key={dir}
                onPointerDown={handlePointerDown(dir)}
                onPointerUp={handlePointerUp(dir)}
                onPointerCancel={handlePointerUp(dir)}
                onPointerLeave={handlePointerUp(dir)}
                style={{
                  gridColumn: col + 1,
                  gridRow: row + 1,
                  width: 48,
                  height: 48,
                  touchAction: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                className={`border-2 rounded-sm font-mono text-white/80 text-sm transition-colors ${
                  isActive
                    ? activeBase
                    : 'bg-slate-800/70 border-slate-600/80'
                }`}
              >
                {ARROW_SYMBOLS[dir]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
