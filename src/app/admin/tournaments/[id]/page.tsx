// Author: Angel Colman
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Trophy, Users, Swords, Gift,
  Trash2, ShieldCheck, CheckCircle2, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { formatDate, mediaUrl } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type TournamentStatus = 'pending' | 'active' | 'finished'
type MatchStatus = 'waiting' | 'playing' | 'finished'

interface Vehicle {
  id: string
  spriteUrl: string | null
  modelName: string | null
  isGeneric: boolean
  genericType: string | null
}

interface Participant {
  id: string
  cedula: string
  playerName: string
  seed: number | null
  createdAt: string
  vehicle: Vehicle | null
}

interface Match {
  id: string
  round: number
  scoreP1: number
  scoreP2: number
  status: MatchStatus
  roomCode: string
  winnerId: string | null
  scheduledAt: string | null
  roomEnabledAt: string | null
  playedAt: string | null
  createdAt: string
  player1: { id: string; playerName: string; cedula: string }
  player2: { id: string; playerName: string; cedula: string }
}

interface Tournament {
  id: string
  name: string
  status: TournamentStatus
  maxPlayers: number
  prizeConfig: Record<string, string>
  gameConfig: Record<string, unknown>
  createdAt: string
  trivia: { id: string; title: string; slug: string } | null
  creator: { id: string; name: string; email: string }
  participants: Participant[]
  matches: Match[]
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-700 border-0">Pendiente</Badge>
  if (status === 'active') return <Badge className="bg-blue-100 text-blue-700 border-0">Activo</Badge>
  return <Badge className="bg-slate-100 text-slate-600 border-0">Finalizado</Badge>
}

function MatchStatusBadge({ status }: { status: MatchStatus }) {
  if (status === 'waiting') return <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">Esperando</Badge>
  if (status === 'playing') return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">En juego</Badge>
  return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Finalizado</Badge>
}

function roundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'Final'
  if (round === totalRounds - 1) return 'Semifinal'
  return `Ronda ${round}`
}

// ─── Participants Tab ─────────────────────────────────────────────────────────

function ParticipantsTab({
  tournament,
  onBracketGenerated,
}: {
  tournament: Tournament
  onBracketGenerated: () => void
}) {
  const { participants, status, matches } = tournament
  const [generatingBracket, setGeneratingBracket] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const canGenerate = status === 'pending' && participants.length >= 2

  const generateBracket = async () => {
    setGeneratingBracket(true)
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}/bracket`, { method: 'POST' })
      if (res.ok) {
        toast.success('Bracket generado correctamente')
        onBracketGenerated()
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Error al generar bracket')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setGeneratingBracket(false)
    }
  }

  const removeParticipant = async (id: string) => {
    setRemoving(true)
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}/participants`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: id }),
      })
      if (res.ok) {
        toast.success('Participante eliminado')
        onBracketGenerated() // reloads tournament data
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Error al eliminar participante')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setRemoving(false)
      setRemoveId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {participants.length} de {tournament.maxPlayers} participantes registrados
        </p>
        {canGenerate && (
          <Button
            onClick={generateBracket}
            disabled={generatingBracket}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generatingBracket
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Swords className="w-4 h-4 mr-2" />}
            Generar Bracket
          </Button>
        )}
        {status === 'active' && matches.length > 0 && (
          <Badge className="bg-green-100 text-green-700 border-0 px-3 py-1">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Bracket generado
          </Badge>
        )}
      </div>

      {participants.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No hay participantes registrados aún</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">Seed</th>
                <th className="text-left px-4 py-3 font-semibold">Jugador</th>
                <th className="text-left px-4 py-3 font-semibold">Cédula</th>
                <th className="text-left px-4 py-3 font-semibold">Vehículo</th>
                <th className="text-left px-4 py-3 font-semibold">Inscripción</th>
                {status === 'pending' && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {participants.map(p => (
                <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.seed ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.playerName}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.cedula}</td>
                  <td className="px-4 py-3">
                    {p.vehicle ? (
                      <div className="flex items-center gap-2">
                        {p.vehicle.spriteUrl && (
                          <img
                            src={mediaUrl(p.vehicle.spriteUrl)}
                            alt={p.vehicle.modelName ?? ''}
                            className="w-8 h-6 object-contain"
                          />
                        )}
                        <span className="text-xs text-slate-500">{p.vehicle.modelName ?? p.vehicle.genericType ?? '—'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">Sin vehículo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(p.createdAt)}</td>
                  {status === 'pending' && (
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => setRemoveId(p.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!removeId}
        title="¿Eliminar participante?"
        description="El participante será removido del torneo. Esta acción no se puede deshacer."
        confirmLabel={removing ? 'Eliminando...' : 'Eliminar'}
        destructive
        onConfirm={() => removeParticipant(removeId!)}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  )
}

// ─── Matches Tab ──────────────────────────────────────────────────────────────

function MatchRow({
  match,
  tournamentId,
  totalRounds,
  onUpdate,
}: {
  match: Match
  tournamentId: string
  totalRounds: number
  onUpdate: (updated: Match) => void
}) {
  const [scoreP1, setScoreP1] = useState(String(match.scoreP1))
  const [scoreP2, setScoreP2] = useState(String(match.scoreP2))
  const [dateVal, setDateVal] = useState(
    match.scheduledAt ? match.scheduledAt.slice(0, 10) : ''
  )
  const [timeVal, setTimeVal] = useState(
    match.scheduledAt ? match.scheduledAt.slice(11, 16) : ''
  )
  const [saving, setSaving] = useState(false)

  const patch = useCallback(async (payload: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/matches`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, ...payload }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(updated)
        toast.success('Partido actualizado')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Error al actualizar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }, [match.id, tournamentId, onUpdate])

  const saveScheduledAt = () => {
    if (dateVal && timeVal) {
      patch({ scheduledAt: `${dateVal}T${timeVal}:00.000Z` })
    } else if (!dateVal && !timeVal) {
      patch({ scheduledAt: null })
    }
  }

  const enableRoom = () => patch({ enableRoom: true })

  const closeMatch = () => {
    const p1 = Number(scoreP1)
    const p2 = Number(scoreP2)
    const winnerId = p1 > p2 ? match.player1.id : p2 > p1 ? match.player2.id : null
    patch({
      scoreP1: p1,
      scoreP2: p2,
      status: 'finished',
      winnerId,
    })
  }

  const saveScores = () => {
    patch({ scoreP1: Number(scoreP1), scoreP2: Number(scoreP2) })
  }

  const isRoomOpen = !!match.roomEnabledAt
  const isFinished = match.status === 'finished'
  const isPlaying = match.status === 'playing'

  return (
    <tr className="bg-white hover:bg-slate-50 transition-colors align-top">
      <td className="px-4 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
        {roundLabel(match.round, totalRounds)}
      </td>
      <td className="px-4 py-4">
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800 text-sm">{match.player1.playerName}</p>
          <p className="text-xs text-slate-400">vs</p>
          <p className="font-semibold text-slate-800 text-sm">{match.player2.playerName}</p>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1.5">
          <Input
            type="date"
            value={dateVal}
            onChange={e => setDateVal(e.target.value)}
            onBlur={saveScheduledAt}
            className="h-8 text-xs w-36"
            disabled={isFinished || saving}
          />
          <Input
            type="time"
            value={timeVal}
            onChange={e => setTimeVal(e.target.value)}
            onBlur={saveScheduledAt}
            className="h-8 text-xs w-36"
            disabled={isFinished || saving}
          />
        </div>
      </td>
      <td className="px-4 py-4">
        {isRoomOpen ? (
          <Badge className="bg-green-100 text-green-700 border-0 text-xs">Sala Abierta</Badge>
        ) : isFinished ? (
          <Badge className="bg-slate-100 text-slate-400 border-0 text-xs">Cerrada</Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={enableRoom}
            disabled={saving}
            className="text-xs h-7"
          >
            <ShieldCheck className="w-3 h-3 mr-1" /> Habilitar Sala
          </Button>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              value={scoreP1}
              onChange={e => setScoreP1(e.target.value)}
              onBlur={saveScores}
              className="h-7 w-16 text-center text-xs"
              disabled={!isRoomOpen || isFinished || saving}
            />
            <Input
              type="number"
              min={0}
              value={scoreP2}
              onChange={e => setScoreP2(e.target.value)}
              onBlur={saveScores}
              className="h-7 w-16 text-center text-xs"
              disabled={!isRoomOpen || isFinished || saving}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <MatchStatusBadge status={match.status} />
        {match.winnerId && (
          <p className="text-xs text-green-600 mt-1 font-medium">
            {match.winnerId === match.player1.id ? match.player1.playerName : match.player2.playerName}
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        {(isPlaying || isRoomOpen) && !isFinished && (
          <Button
            size="sm"
            variant="outline"
            onClick={closeMatch}
            disabled={saving}
            className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cerrar'}
          </Button>
        )}
      </td>
    </tr>
  )
}

function MatchesTab({ tournament, onMatchUpdate }: { tournament: Tournament; onMatchUpdate: (m: Match) => void }) {
  const { matches } = tournament

  if (matches.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <Swords className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            {tournament.status === 'pending'
              ? 'Genera el bracket desde la pestaña Participantes para ver los partidos'
              : 'No hay partidos registrados'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const roundSet = new Set(matches.map(m => m.round))
  const rounds = Array.from(roundSet).sort((a, b) => a - b)
  const totalRounds = Math.max(...rounds)

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-slate-700">Llave del Torneo</h2>
      {rounds.map(round => {
        const roundMatches = matches.filter(m => m.round === round)
        return (
          <div key={round}>
            <h3 className="text-sm font-bold text-slate-600 mb-2 px-1">
              {roundLabel(round, totalRounds)}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-semibold">Ronda</th>
                    <th className="text-left px-4 py-3 font-semibold">Jugadores</th>
                    <th className="text-left px-4 py-3 font-semibold">Programado</th>
                    <th className="text-left px-4 py-3 font-semibold">Sala</th>
                    <th className="text-left px-4 py-3 font-semibold">Marcador</th>
                    <th className="text-left px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {roundMatches.map(m => (
                    <MatchRow
                      key={m.id}
                      match={m}
                      tournamentId={tournament.id}
                      totalRounds={totalRounds}
                      onUpdate={onMatchUpdate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Prizes Tab ───────────────────────────────────────────────────────────────

function PrizesTab({ tournament, onSave }: { tournament: Tournament; onSave: (updated: Tournament) => void }) {
  const [prizes, setPrizes] = useState<{ position: string; prize: string }[]>(
    Object.entries(tournament.prizeConfig).map(([position, prize]) => ({ position, prize }))
  )
  const [duration, setDuration] = useState<number>(
    typeof tournament.gameConfig.duration === 'number' ? tournament.gameConfig.duration : 90
  )
  const [saving, setSaving] = useState(false)

  const addPrize = () => {
    const taken = prizes.map(p => Number(p.position))
    let next = 1
    while (taken.includes(next)) next++
    setPrizes(prev => [...prev, { position: String(next), prize: '' }])
  }

  const save = async () => {
    setSaving(true)
    const prizeConfig: Record<string, string> = {}
    prizes.forEach(p => { if (p.prize.trim()) prizeConfig[p.position] = p.prize.trim() })

    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prizeConfig,
          gameConfig: { ...tournament.gameConfig, duration },
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onSave(updated)
        toast.success('Configuración guardada')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const ordinalLabel = (n: number) => {
    const labels: Record<number, string> = { 1: '1er', 2: '2do', 3: '3er' }
    return labels[n] ?? `${n}to`
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-700">Configuración de partida</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Duración por partida (segundos)</Label>
            <Input
              type="number"
              min={30}
              max={300}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">Entre 30 y 300 segundos. Actual: {duration}s</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-700">Premios</CardTitle>
            <Button variant="outline" size="sm" onClick={addPrize}>
              <Plus className="w-3 h-3 mr-1" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {prizes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No hay premios configurados</p>
          ) : (
            <div className="space-y-3">
              {prizes.map((row, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-24 flex-shrink-0">
                    <Input
                      type="number"
                      min={1}
                      value={row.position}
                      onChange={e => setPrizes(prev => prev.map((r, i) => i === idx ? { ...r, position: e.target.value } : r))}
                      className="text-center"
                    />
                    <p className="text-xs text-slate-400 text-center mt-0.5">{ordinalLabel(Number(row.position))} lugar</p>
                  </div>
                  <Input
                    value={row.prize}
                    onChange={e => setPrizes(prev => prev.map((r, i) => i === idx ? { ...r, prize: e.target.value } : r))}
                    placeholder={`Premio para el ${ordinalLabel(Number(row.position))} lugar`}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600"
                    onClick={() => setPrizes(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('participants')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tournaments/${params.id}`)
      if (res.ok) {
        setTournament(await res.json())
      } else if (res.status === 404) {
        toast.error('Torneo no encontrado')
        router.push('/admin/tournaments')
      } else {
        toast.error('Error al cargar torneo')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => { load() }, [load])

  const handleMatchUpdate = useCallback((updated: Match) => {
    setTournament(prev => {
      if (!prev) return prev
      return {
        ...prev,
        matches: prev.matches.map(m => m.id === updated.id ? updated : m),
      }
    })
  }, [])

  const handleBracketGenerated = useCallback(async () => {
    await load()
    setActiveTab('matches')
  }, [load])

  const handleTournamentSave = useCallback((updated: Tournament) => {
    setTournament(prev => prev ? { ...prev, ...updated } : prev)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!tournament) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/tournaments">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-black text-slate-800">{tournament.name}</h1>
          <TournamentStatusBadge status={tournament.status} />
        </div>
      </div>

      {tournament.trivia && (
        <p className="text-sm text-slate-400 -mt-2 ml-1">
          Trivia: <span className="font-medium text-slate-600">{tournament.trivia.title}</span>
        </p>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="participants" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Participantes
            {tournament.participants.length > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {tournament.participants.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="matches" className="gap-1.5">
            <Swords className="w-3.5 h-3.5" />
            Partidos
            {tournament.matches.length > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {tournament.matches.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="prizes" className="gap-1.5">
            <Gift className="w-3.5 h-3.5" />
            Premios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="mt-6">
          <ParticipantsTab
            tournament={tournament}
            onBracketGenerated={handleBracketGenerated}
          />
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <MatchesTab
            tournament={tournament}
            onMatchUpdate={handleMatchUpdate}
          />
        </TabsContent>

        <TabsContent value="prizes" className="mt-6">
          <PrizesTab
            tournament={tournament}
            onSave={handleTournamentSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
