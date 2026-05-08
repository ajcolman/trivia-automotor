// Author: Angel Colman
'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createInitialState,
  stepPhysics,
  FIELD,
  type GameState,
  type PlayerInput,
  type Vehicle,
  type Ball,
} from '@/lib/football/physics'
import {
  createMatchChannel,
  sendGameState,
  sendPlayerInput,
  sendGoal,
  sendMatchEnd,
  type MatchChannelResult,
} from '@/lib/football/pusher-client'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GameCanvasProps {
  matchCode: string
  playerId: 1 | 2
  player1Name: string
  player2Name: string
  player1SpriteUrl?: string
  player2SpriteUrl?: string
  duration: number
  onMatchEnd: (score1: number, score2: number) => void
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

const FIELD_COLOR = '#1a5c1a'
const LINE_COLOR = '#2d8c2d'
const GOAL_COLOR = '#f0d000'
const WALL_COLOR = '#0e3d0e'
const BALL_COLOR = '#ffffff'
const P1_COLOR = '#0052cc'
const P2_COLOR = '#cc1a00'

const VEHICLE_W = 36
const VEHICLE_H = 22
const BALL_RADIUS = 12

function drawField(ctx: CanvasRenderingContext2D) {
  const { width, height, wallThickness, goalWidth, goalHeight } = FIELD

  // Background field
  ctx.fillStyle = FIELD_COLOR
  ctx.fillRect(0, 0, width, height)

  // Walls
  ctx.fillStyle = WALL_COLOR
  ctx.fillRect(0, 0, width, wallThickness)                           // top
  ctx.fillRect(0, height - wallThickness, width, wallThickness)       // bottom
  ctx.fillRect(0, 0, wallThickness, height)                          // left
  ctx.fillRect(width - wallThickness, 0, wallThickness, height)      // right

  // Cutout goal openings in walls
  const goalTop = height / 2 - goalHeight / 2
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, goalTop, wallThickness, goalHeight)                          // left opening
  ctx.fillRect(width - wallThickness, goalTop, wallThickness, goalHeight)      // right opening

  // Center line
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(width / 2, wallThickness)
  ctx.lineTo(width / 2, height - wallThickness)
  ctx.stroke()
  ctx.setLineDash([])

  // Center circle
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 60, 0, Math.PI * 2)
  ctx.stroke()

  // Center dot
  ctx.fillStyle = LINE_COLOR
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 4, 0, Math.PI * 2)
  ctx.fill()

  // Goal posts (left)
  ctx.fillStyle = GOAL_COLOR
  ctx.fillRect(wallThickness - goalWidth, goalTop, goalWidth, 6)                // top post
  ctx.fillRect(wallThickness - goalWidth, goalTop + goalHeight - 6, goalWidth, 6) // bottom post
  ctx.fillStyle = 'rgba(240,208,0,0.18)'
  ctx.fillRect(wallThickness - goalWidth, goalTop, goalWidth, goalHeight)       // net fill

  // Goal posts (right)
  ctx.fillStyle = GOAL_COLOR
  ctx.fillRect(width - wallThickness, goalTop, goalWidth, 6)
  ctx.fillRect(width - wallThickness, goalTop + goalHeight - 6, goalWidth, 6)
  ctx.fillStyle = 'rgba(240,208,0,0.18)'
  ctx.fillRect(width - wallThickness, goalTop, goalWidth, goalHeight)

  // Corner arcs
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 2
  const cornerR = 18
  const wt = wallThickness
  const corners: [number, number, number, number][] = [
    [wt, wt, 0, Math.PI / 2],
    [width - wt, wt, Math.PI / 2, Math.PI],
    [width - wt, height - wt, Math.PI, 1.5 * Math.PI],
    [wt, height - wt, 1.5 * Math.PI, 2 * Math.PI],
  ]
  for (const [cx, cy, start, end] of corners) {
    ctx.beginPath()
    ctx.arc(cx, cy, cornerR, start, end)
    ctx.stroke()
  }
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  const { x, y } = ball.pos

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(x + 3, y + 3, BALL_RADIUS, BALL_RADIUS * 0.6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Ball
  ctx.fillStyle = BALL_COLOR
  ctx.beginPath()
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  // Black outline
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2)
  ctx.stroke()

  // Simple cross detail (8-bit style)
  ctx.strokeStyle = '#222222'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - BALL_RADIUS * 0.5, y)
  ctx.lineTo(x + BALL_RADIUS * 0.5, y)
  ctx.moveTo(x, y - BALL_RADIUS * 0.5)
  ctx.lineTo(x, y + BALL_RADIUS * 0.5)
  ctx.stroke()
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  vehicle: Vehicle,
  sprite: HTMLImageElement | null,
) {
  ctx.save()
  ctx.translate(vehicle.pos.x, vehicle.pos.y)
  ctx.rotate(vehicle.angle)

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sprite, -VEHICLE_W / 2, -VEHICLE_H / 2, VEHICLE_W, VEHICLE_H)
  } else {
    // Pixel-art fallback car
    const color = vehicle.playerId === 1 ? P1_COLOR : P2_COLOR
    const highlight = vehicle.playerId === 1 ? '#3378e8' : '#e84444'
    const dark = vehicle.playerId === 1 ? '#002f80' : '#880000'

    // Body
    ctx.fillStyle = color
    ctx.fillRect(-VEHICLE_W / 2, -VEHICLE_H / 2, VEHICLE_W, VEHICLE_H)

    // Roof highlight
    ctx.fillStyle = highlight
    ctx.fillRect(-VEHICLE_W / 2 + 4, -VEHICLE_H / 2 + 2, VEHICLE_W - 16, VEHICLE_H - 8)

    // Windshield
    ctx.fillStyle = 'rgba(180,230,255,0.7)'
    ctx.fillRect(VEHICLE_W / 2 - 12, -VEHICLE_H / 2 + 4, 8, VEHICLE_H - 8)

    // Rear window
    ctx.fillStyle = 'rgba(180,230,255,0.4)'
    ctx.fillRect(-VEHICLE_W / 2 + 2, -VEHICLE_H / 2 + 4, 6, VEHICLE_H - 8)

    // Wheels (darker)
    ctx.fillStyle = dark
    const ww = 6
    const wh = 5
    ctx.fillRect(-VEHICLE_W / 2 + 2, -VEHICLE_H / 2 - 1, ww, wh)       // front-left
    ctx.fillRect(-VEHICLE_W / 2 + 2, VEHICLE_H / 2 - wh + 1, ww, wh)   // rear-left
    ctx.fillRect(VEHICLE_W / 2 - ww - 2, -VEHICLE_H / 2 - 1, ww, wh)   // front-right
    ctx.fillRect(VEHICLE_W / 2 - ww - 2, VEHICLE_H / 2 - wh + 1, ww, wh) // rear-right

    // Headlights
    ctx.fillStyle = '#fffaaa'
    ctx.fillRect(VEHICLE_W / 2 - 3, -VEHICLE_H / 2 + 3, 3, 4)
    ctx.fillRect(VEHICLE_W / 2 - 3, VEHICLE_H / 2 - 7, 3, 4)

    // Taillights
    ctx.fillStyle = '#ff4444'
    ctx.fillRect(-VEHICLE_W / 2, -VEHICLE_H / 2 + 3, 3, 4)
    ctx.fillRect(-VEHICLE_W / 2, VEHICLE_H / 2 - 7, 3, 4)
  }

  ctx.restore()
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  player1Name: string,
  player2Name: string,
) {
  const { width } = FIELD

  // HUD bar background
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, width, 32)

  ctx.imageSmoothingEnabled = false
  ctx.font = 'bold 18px monospace'
  ctx.textBaseline = 'middle'

  // Player 1 name + score
  ctx.fillStyle = '#5599ff'
  const p1Score = `${player1Name.slice(0, 8).toUpperCase()} ${state.score1}`
  ctx.textAlign = 'left'
  ctx.fillText(p1Score, 14, 16)

  // Timer center
  const mins = Math.floor(state.timeLeft / 60)
  const secs = Math.floor(state.timeLeft % 60)
  const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`
  ctx.fillStyle = state.timeLeft <= 10 ? '#ff4444' : '#ffffff'
  ctx.font = 'bold 20px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(timerStr, width / 2, 16)

  // Player 2 name + score
  ctx.fillStyle = '#ff6666'
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'right'
  const p2Score = `${state.score2} ${player2Name.slice(0, 8).toUpperCase()}`
  ctx.fillText(p2Score, width - 14, 16)

  // Role badge
  ctx.textAlign = 'center'
  ctx.font = '10px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GameCanvas({
  matchCode,
  playerId,
  player1Name,
  player2Name,
  player1SpriteUrl,
  player2SpriteUrl,
  duration,
  onMatchEnd,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(createInitialState(duration))
  const inputRef = useRef<PlayerInput>({ up: false, down: false, left: false, right: false })
  const opponentInputRef = useRef<PlayerInput>({ up: false, down: false, left: false, right: false })
  const isHostRef = useRef(false)
  const channelRef = useRef<MatchChannelResult | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const golFlashRef = useRef<{ scorer: 1 | 2; until: number } | null>(null)
  const matchEndedRef = useRef(false)
  const sprite1Ref = useRef<HTMLImageElement | null>(null)
  const sprite2Ref = useRef<HTMLImageElement | null>(null)

  // Stable callback ref for onMatchEnd
  const onMatchEndRef = useRef(onMatchEnd)
  onMatchEndRef.current = onMatchEnd

  // ── Sprite preload ────────────────────────────────────────────────────────
  useEffect(() => {
    if (player1SpriteUrl) {
      const img = new Image()
      img.src = player1SpriteUrl
      sprite1Ref.current = img
    }
    if (player2SpriteUrl) {
      const img = new Image()
      img.src = player2SpriteUrl
      sprite2Ref.current = img
    }
  }, [player1SpriteUrl, player2SpriteUrl])

  // ── Keyboard input ────────────────────────────────────────────────────────
  useEffect(() => {
    const KEYS: Record<string, keyof PlayerInput> = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = KEYS[e.code]
      if (k) {
        e.preventDefault()
        inputRef.current[k] = true
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const k = KEYS[e.code]
      if (k) inputRef.current[k] = false
    }

    window.addEventListener('keydown', onKeyDown, { passive: false })
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // ── Game loop ─────────────────────────────────────────────────────────────
  const gameLoop = useCallback((ts: number) => {
    if (matchEndedRef.current) return

    const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05)
    lastTimeRef.current = ts

    const canvas = canvasRef.current
    if (!canvas) {
      rafRef.current = requestAnimationFrame(gameLoop)
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      rafRef.current = requestAnimationFrame(gameLoop)
      return
    }

    ctx.imageSmoothingEnabled = false

    // ── Physics (host only) ─────────────────────────────────────────────────
    if (isHostRef.current) {
      const inputs1: PlayerInput = playerId === 1 ? inputRef.current : opponentInputRef.current
      const inputs2: PlayerInput = playerId === 2 ? inputRef.current : opponentInputRef.current

      const result = stepPhysics(stateRef.current, inputs1, inputs2, dt)
      stateRef.current = result.state

      const ch = channelRef.current?.channel
      if (ch) {
        // Send state ~20fps (every other frame is fine, Pusher client events are rate-limited)
        sendGameState(ch, stateRef.current)

        // Send input to opponent so they know our state
        sendPlayerInput(ch, playerId, inputRef.current)

        if (result.goal !== null) {
          sendGoal(ch, result.goal)
          golFlashRef.current = { scorer: result.goal, until: ts + 2000 }
        }

        if (!result.state.running && !matchEndedRef.current) {
          matchEndedRef.current = true
          sendMatchEnd(ch, result.state.score1, result.state.score2)
          onMatchEndRef.current(result.state.score1, result.state.score2)
        }
      }
    } else {
      // Guest: only send own input
      const ch = channelRef.current?.channel
      if (ch) {
        sendPlayerInput(ch, playerId, inputRef.current)
      }
    }

    // ── Render ──────────────────────────────────────────────────────────────
    const state = stateRef.current

    drawField(ctx)
    drawBall(ctx, state.ball)
    drawVehicle(ctx, state.vehicle1, sprite1Ref.current)
    drawVehicle(ctx, state.vehicle2, sprite2Ref.current)
    drawHUD(ctx, state, player1Name, player2Name)

    // GOL flash overlay
    if (golFlashRef.current && ts < golFlashRef.current.until) {
      const { scorer } = golFlashRef.current
      const alpha = Math.min(1, (golFlashRef.current.until - ts) / 500)
      ctx.fillStyle = scorer === 1 ? `rgba(0,82,204,${alpha * 0.35})` : `rgba(204,26,0,${alpha * 0.35})`
      ctx.fillRect(0, 0, FIELD.width, FIELD.height)

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = 'bold 72px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = scorer === 1 ? '#5599ff' : '#ff6644'
      ctx.shadowBlur = 24
      ctx.fillText('¡GOL!', FIELD.width / 2, FIELD.height / 2)
      ctx.restore()
    }

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [playerId, player1Name, player2Name])

  // ── Pusher setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    let subscribeCount = 0

    const matchChannel = createMatchChannel(matchCode, {
      onSubscriptionSucceeded: () => {
        subscribeCount++
        // First to subscribe is host (player 1), second is guest (player 2)
        // Pusher doesn't expose member count easily on private (non-presence) channels,
        // so we use the playerId prop passed from parent (server-determined)
        isHostRef.current = playerId === 1
      },

      onStateUpdate: (newState: GameState) => {
        // Guest: accept state from host
        if (!isHostRef.current) {
          stateRef.current = newState
        }
      },

      onGoal: (scorer: 1 | 2) => {
        // Guest: show GOL flash (host already handles this locally)
        if (!isHostRef.current) {
          golFlashRef.current = { scorer, until: performance.now() + 2000 }
        }
      },

      onMatchEnd: (score1: number, score2: number) => {
        if (!isHostRef.current && !matchEndedRef.current) {
          matchEndedRef.current = true
          onMatchEndRef.current(score1, score2)
        }
      },

      onOpponentInput: (_pid: 1 | 2, input: PlayerInput) => {
        // Host receives opponent input
        if (isHostRef.current) {
          opponentInputRef.current = input
        }
      },
    })

    channelRef.current = matchChannel

    // Start game loop
    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      matchChannel.cleanup()
    }
  }, [matchCode, playerId, gameLoop])

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={FIELD.width}
        height={FIELD.height}
        style={{
          imageRendering: 'pixelated',
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          border: '3px solid #0e3d0e',
          borderRadius: 4,
          boxShadow: '0 0 32px rgba(0,0,0,0.6)',
        }}
      />
      <div className="flex gap-6 text-xs font-mono text-slate-500 mt-1">
        <span className="text-sky-400">
          {playerId === 1 ? '⬛ Tú' : `⬛ ${player1Name}`} — WASD / ↑↓←→
        </span>
        <span className="text-red-400">
          {playerId === 2 ? '⬛ Tú' : `⬛ ${player2Name}`} — WASD / ↑↓←→
        </span>
      </div>
    </div>
  )
}
