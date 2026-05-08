// Author: Angel Colman
import Pusher, { Channel } from 'pusher-js'
import type { GameState, PlayerInput } from './physics'

export type { GameState, PlayerInput }

export interface MatchChannelHandlers {
  onStateUpdate?: (state: GameState) => void
  onGoal?: (scorer: 1 | 2) => void
  onMatchEnd?: (score1: number, score2: number) => void
  onOpponentInput?: (playerId: 1 | 2, input: PlayerInput) => void
  onSubscriptionSucceeded?: () => void
}

export interface MatchChannelResult {
  channel: Channel
  pusher: Pusher
  cleanup: () => void
}

export function createMatchChannel(
  roomCode: string,
  handlers: MatchChannelHandlers,
): MatchChannelResult {
  const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
    forceTLS: true,
  })

  const channelName = `private-match-${roomCode}`
  const channel = pusher.subscribe(channelName)

  channel.bind('pusher:subscription_succeeded', () => {
    handlers.onSubscriptionSucceeded?.()
  })

  // Guest receives full game state from host
  channel.bind('client-game-state', (data: GameState) => {
    handlers.onStateUpdate?.(data)
  })

  // Both receive goal events
  channel.bind('client-goal', (data: { scorer: 1 | 2 }) => {
    handlers.onGoal?.(data.scorer)
  })

  // Both receive match end
  channel.bind('client-match-end', (data: { score1: number; score2: number }) => {
    handlers.onMatchEnd?.(data.score1, data.score2)
  })

  // Host receives input from guest (player2)
  channel.bind('client-input-1', (data: { input: PlayerInput }) => {
    handlers.onOpponentInput?.(1, data.input)
  })

  channel.bind('client-input-2', (data: { input: PlayerInput }) => {
    handlers.onOpponentInput?.(2, data.input)
  })

  const cleanup = () => {
    channel.unbind_all()
    pusher.unsubscribe(channelName)
    pusher.disconnect()
  }

  return { channel, pusher, cleanup }
}

/** Host sends full game state to guest */
export function sendGameState(channel: Channel, state: GameState): void {
  try {
    channel.trigger('client-game-state', state)
  } catch {
    // Pusher rate limit or not yet subscribed — silently ignore
  }
}

/** Send local player input to opponent */
export function sendPlayerInput(channel: Channel, playerId: 1 | 2, input: PlayerInput): void {
  try {
    channel.trigger(`client-input-${playerId}`, { input })
  } catch {
    // ignore
  }
}

/** Host announces a goal */
export function sendGoal(channel: Channel, scorer: 1 | 2): void {
  try {
    channel.trigger('client-goal', { scorer })
  } catch {
    // ignore
  }
}

/** Host announces match end */
export function sendMatchEnd(channel: Channel, score1: number, score2: number): void {
  try {
    channel.trigger('client-match-end', { score1, score2 })
  } catch {
    // ignore
  }
}
