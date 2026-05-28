// Author: Angel Colman
'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { PlayerInput } from '@/lib/football/physics'

export interface UseInputSourcesResult {
  input1Ref: React.MutableRefObject<PlayerInput>
  input2Ref: React.MutableRefObject<PlayerInput>
  setTouchInput: (playerId: 1 | 2, partial: Partial<PlayerInput>) => void
}

function makeInput(): PlayerInput {
  return { up: false, down: false, left: false, right: false }
}

export function useInputSources(
  mode: 'online' | 'local',
  _localPlayerId?: 1 | 2,
): UseInputSourcesResult {
  const input1Ref = useRef<PlayerInput>(makeInput())
  const input2Ref = useRef<PlayerInput>(makeInput())

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const WASD: Record<string, keyof PlayerInput> = {
      KeyW: 'up',
      KeyS: 'down',
      KeyA: 'left',
      KeyD: 'right',
    }
    const ARROWS: Record<string, keyof PlayerInput> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const wasd = WASD[e.code]
      if (wasd) {
        e.preventDefault()
        input1Ref.current[wasd] = true
      }
      const arrow = ARROWS[e.code]
      if (arrow) {
        e.preventDefault()
        if (mode === 'local') {
          input2Ref.current[arrow] = true
        } else {
          // online: both map to local player (input1)
          input1Ref.current[arrow] = true
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const wasd = WASD[e.code]
      if (wasd) {
        input1Ref.current[wasd] = false
      }
      const arrow = ARROWS[e.code]
      if (arrow) {
        if (mode === 'local') {
          input2Ref.current[arrow] = false
        } else {
          input1Ref.current[arrow] = false
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, { passive: false })
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [mode])

  // ── Gamepad polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined') return

    const poll = () => {
      const gamepads = navigator.getGamepads()

      for (let i = 0; i <= 1; i++) {
        const gp = gamepads[i]
        if (!gp) continue

        const targetRef = i === 0 ? input1Ref : input2Ref

        const axisX = gp.axes[0] ?? 0
        const axisY = gp.axes[1] ?? 0

        const btnUp = gp.buttons[12]?.pressed ?? false
        const btnDown = gp.buttons[13]?.pressed ?? false
        const btnLeft = gp.buttons[14]?.pressed ?? false
        const btnRight = gp.buttons[15]?.pressed ?? false

        targetRef.current.up = axisY < -0.5 || btnUp
        targetRef.current.down = axisY > 0.5 || btnDown
        targetRef.current.left = axisX < -0.5 || btnLeft
        targetRef.current.right = axisX > 0.5 || btnRight
      }
    }

    const intervalId = setInterval(poll, 16)
    return () => clearInterval(intervalId)
  }, [])

  // ── Touch input setter ───────────────────────────────────────────────────────
  const setTouchInput = useCallback(
    (playerId: 1 | 2, partial: Partial<PlayerInput>) => {
      const targetRef = playerId === 1 ? input1Ref : input2Ref
      Object.assign(targetRef.current, partial)
    },
    [],
  )

  return { input1Ref, input2Ref, setTouchInput }
}
