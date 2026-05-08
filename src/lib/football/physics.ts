// Author: Angel Colman

export interface Vec2 {
  x: number
  y: number
}

export interface Vehicle {
  pos: Vec2
  vel: Vec2
  angle: number      // radians
  angularVel: number
  playerId: 1 | 2
}

export interface Ball {
  pos: Vec2
  vel: Vec2
}

export interface GameState {
  vehicle1: Vehicle
  vehicle2: Vehicle
  ball: Ball
  score1: number
  score2: number
  timeLeft: number   // seconds
  running: boolean
}

export interface PlayerInput {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

// Field dimensions (px)
export const FIELD = {
  width: 800,
  height: 500,
  goalWidth: 20,
  goalHeight: 120,
  wallThickness: 20,
}

// Vehicle size
const VEHICLE_W = 36
const VEHICLE_H = 22
const BALL_RADIUS = 12

// Physics constants
const VEHICLE_ACCEL = 300     // px/s²
const VEHICLE_FRICTION = 0.85
const VEHICLE_ROT_SPEED = 2.094  // ~120 deg/s in radians/s
const BALL_FRICTION = 0.98

// Starting positions
function defaultVehicle(playerId: 1 | 2): Vehicle {
  return {
    pos: {
      x: playerId === 1 ? FIELD.width * 0.25 : FIELD.width * 0.75,
      y: FIELD.height * 0.5,
    },
    vel: { x: 0, y: 0 },
    angle: playerId === 1 ? 0 : Math.PI,
    angularVel: 0,
    playerId,
  }
}

function defaultBall(): Ball {
  return {
    pos: { x: FIELD.width / 2, y: FIELD.height / 2 },
    vel: { x: 0, y: 0 },
  }
}

export function createInitialState(duration: number): GameState {
  return {
    vehicle1: defaultVehicle(1),
    vehicle2: defaultVehicle(2),
    ball: defaultBall(),
    score1: 0,
    score2: 0,
    timeLeft: duration,
    running: true,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

function len(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

function normalize(v: Vec2): Vec2 {
  const l = len(v)
  if (l === 0) return { x: 0, y: 0 }
  return { x: v.x / l, y: v.y / l }
}

/** Returns the 4 corners of a vehicle given its state */
function vehicleCorners(v: Vehicle): Vec2[] {
  const hw = VEHICLE_W / 2
  const hh = VEHICLE_H / 2
  const cos = Math.cos(v.angle)
  const sin = Math.sin(v.angle)
  const corners: [number, number][] = [
    [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh],
  ]
  return corners.map(([lx, ly]) => ({
    x: v.pos.x + lx * cos - ly * sin,
    y: v.pos.y + lx * sin + ly * cos,
  }))
}

/** Closest point on a line segment to a point */
function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = { x: b.x - a.x, y: b.y - a.y }
  const ap = { x: p.x - a.x, y: p.y - a.y }
  const t = Math.max(0, Math.min(1, dot(ap, ab) / (dot(ab, ab) || 1)))
  return { x: a.x + ab.x * t, y: a.y + ab.y * t }
}

/** Resolve ball vs vehicle OBB collision */
function resolveVehicleBallCollision(vehicle: Vehicle, ball: Ball): Ball {
  const corners = vehicleCorners(vehicle)
  let minDist = Infinity
  let closestPt: Vec2 = { x: 0, y: 0 }

  // Check each edge of vehicle
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    const cp = closestPointOnSegment(ball.pos, a, b)
    const dx = ball.pos.x - cp.x
    const dy = ball.pos.y - cp.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < minDist) {
      minDist = dist
      closestPt = cp
    }
  }

  if (minDist > BALL_RADIUS) return ball

  // Collision: push ball away
  const normal = normalize({
    x: ball.pos.x - closestPt.x,
    y: ball.pos.y - closestPt.y,
  })

  // Separate ball
  const overlap = BALL_RADIUS - minDist
  const newPos: Vec2 = {
    x: ball.pos.x + normal.x * (overlap + 0.5),
    y: ball.pos.y + normal.y * (overlap + 0.5),
  }

  // Impulse: reflect ball velocity + add vehicle velocity contribution
  const vVehicle = vehicle.vel
  const relVel = {
    x: ball.vel.x - vVehicle.x,
    y: ball.vel.y - vVehicle.y,
  }
  const velAlongNormal = dot(relVel, normal)
  const restitution = 1.1  // slightly elastic

  if (velAlongNormal < 0) {
    const impulse = -(1 + restitution) * velAlongNormal
    const vehicleSpeed = len(vVehicle)
    const extraPush = Math.max(vehicleSpeed * 0.8, 80) // minimum push

    const newVel: Vec2 = {
      x: ball.vel.x + normal.x * impulse + normal.x * extraPush,
      y: ball.vel.y + normal.y * impulse + normal.y * extraPush,
    }

    // Cap ball speed
    const speed = len(newVel)
    const maxSpeed = 700
    if (speed > maxSpeed) {
      return {
        pos: newPos,
        vel: { x: newVel.x / speed * maxSpeed, y: newVel.y / speed * maxSpeed },
      }
    }

    return { pos: newPos, vel: newVel }
  }

  return { pos: newPos, vel: ball.vel }
}

/** Check if ball is inside the goal zone */
function checkGoal(ball: Ball): null | 1 | 2 {
  const ballX = ball.pos.x
  const ballY = ball.pos.y
  const goalTop = FIELD.height / 2 - FIELD.goalHeight / 2
  const goalBottom = FIELD.height / 2 + FIELD.goalHeight / 2

  const inGoalYZone = ballY >= goalTop && ballY <= goalBottom

  // Left goal → player2 scored
  if (ballX - BALL_RADIUS <= FIELD.wallThickness && inGoalYZone) {
    return 2
  }

  // Right goal → player1 scored
  if (ballX + BALL_RADIUS >= FIELD.width - FIELD.wallThickness && inGoalYZone) {
    return 1
  }

  return null
}

// ─── Main physics step ───────────────────────────────────────────────────────

export function stepPhysics(
  state: GameState,
  inputs1: PlayerInput,
  inputs2: PlayerInput,
  dt: number,
): { state: GameState; goal: null | 1 | 2 } {
  if (!state.running) return { state, goal: null }

  // --- Update timer
  const newTimeLeft = Math.max(0, state.timeLeft - dt)
  const stillRunning = newTimeLeft > 0

  // --- Update vehicles
  const v1 = updateVehicle(state.vehicle1, inputs1, dt)
  const v2 = updateVehicle(state.vehicle2, inputs2, dt)

  // --- Update ball
  let ball = updateBall(state.ball, dt)

  // --- Resolve vehicle-ball collisions
  ball = resolveVehicleBallCollision(v1, ball)
  ball = resolveVehicleBallCollision(v2, ball)

  // --- Check goal
  const goal = checkGoal(ball)

  let score1 = state.score1
  let score2 = state.score2

  if (goal !== null) {
    if (goal === 1) score1++
    if (goal === 2) score2++

    // Reset positions after goal
    return {
      state: {
        vehicle1: defaultVehicle(1),
        vehicle2: defaultVehicle(2),
        ball: defaultBall(),
        score1,
        score2,
        timeLeft: newTimeLeft,
        running: stillRunning,
      },
      goal,
    }
  }

  return {
    state: {
      vehicle1: v1,
      vehicle2: v2,
      ball,
      score1,
      score2,
      timeLeft: newTimeLeft,
      running: stillRunning,
    },
    goal: null,
  }
}

function updateVehicle(v: Vehicle, input: PlayerInput, dt: number): Vehicle {
  // Rotation
  let angularVel = v.angularVel
  if (input.left) angularVel = -VEHICLE_ROT_SPEED
  else if (input.right) angularVel = VEHICLE_ROT_SPEED
  else angularVel = 0

  const newAngle = v.angle + angularVel * dt

  // Thrust along facing direction
  const cos = Math.cos(newAngle)
  const sin = Math.sin(newAngle)

  let vx = v.vel.x
  let vy = v.vel.y

  if (input.up) {
    vx += cos * VEHICLE_ACCEL * dt
    vy += sin * VEHICLE_ACCEL * dt
  } else if (input.down) {
    vx -= cos * VEHICLE_ACCEL * dt
    vy -= sin * VEHICLE_ACCEL * dt
  }

  // Friction
  vx *= VEHICLE_FRICTION
  vy *= VEHICLE_FRICTION

  // Cap speed
  const speed = Math.sqrt(vx * vx + vy * vy)
  const maxSpeed = 350
  if (speed > maxSpeed) {
    vx = (vx / speed) * maxSpeed
    vy = (vy / speed) * maxSpeed
  }

  // Move
  let px = v.pos.x + vx * dt
  let py = v.pos.y + vy * dt

  // Clamp to field
  const hw = VEHICLE_W / 2
  const hh = VEHICLE_H / 2
  const margin = Math.max(hw, hh) + 2
  px = Math.max(FIELD.wallThickness + margin, Math.min(FIELD.width - FIELD.wallThickness - margin, px))
  py = Math.max(FIELD.wallThickness + margin, Math.min(FIELD.height - FIELD.wallThickness - margin, py))

  // Bounce off walls
  if (px <= FIELD.wallThickness + margin || px >= FIELD.width - FIELD.wallThickness - margin) {
    vx *= -0.3
  }
  if (py <= FIELD.wallThickness + margin || py >= FIELD.height - FIELD.wallThickness - margin) {
    vy *= -0.3
  }

  return {
    pos: { x: px, y: py },
    vel: { x: vx, y: vy },
    angle: newAngle,
    angularVel,
    playerId: v.playerId,
  }
}

function updateBall(ball: Ball, dt: number): Ball {
  let vx = ball.vel.x * BALL_FRICTION
  let vy = ball.vel.y * BALL_FRICTION

  let px = ball.pos.x + vx * dt
  let py = ball.pos.y + vy * dt

  const goalTop = FIELD.height / 2 - FIELD.goalHeight / 2
  const goalBottom = FIELD.height / 2 + FIELD.goalHeight / 2
  const inGoalYZone = py >= goalTop && py <= goalBottom

  // Wall bounce (left)
  if (px - BALL_RADIUS <= FIELD.wallThickness && !inGoalYZone) {
    px = FIELD.wallThickness + BALL_RADIUS
    vx = Math.abs(vx) * 0.8
  }

  // Wall bounce (right)
  if (px + BALL_RADIUS >= FIELD.width - FIELD.wallThickness && !inGoalYZone) {
    px = FIELD.width - FIELD.wallThickness - BALL_RADIUS
    vx = -Math.abs(vx) * 0.8
  }

  // Top wall
  if (py - BALL_RADIUS <= FIELD.wallThickness) {
    py = FIELD.wallThickness + BALL_RADIUS
    vy = Math.abs(vy) * 0.8
  }

  // Bottom wall
  if (py + BALL_RADIUS >= FIELD.height - FIELD.wallThickness) {
    py = FIELD.height - FIELD.wallThickness - BALL_RADIUS
    vy = -Math.abs(vy) * 0.8
  }

  return { pos: { x: px, y: py }, vel: { x: vx, y: vy } }
}
