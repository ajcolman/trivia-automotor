// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Trivia {
  id: string
  title: string
  slug: string
}

interface PrizeRow {
  position: number
  prize: string
}

export default function NewTournamentPage() {
  const router = useRouter()

  const [trivias, setTrivias] = useState<Trivia[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [name, setName] = useState('')
  const [triviaId, setTriviaId] = useState<string>('')
  const [maxPlayers, setMaxPlayers] = useState<number>(16)
  const [duration, setDuration] = useState<number>(90)
  const [prizes, setPrizes] = useState<PrizeRow[]>([{ position: 1, prize: '' }])

  useEffect(() => {
    fetch('/api/admin/trivias')
      .then(r => r.json())
      .then(data => setTrivias(Array.isArray(data) ? data : []))
      .catch(() => toast.error('No se pudieron cargar las trivias'))
  }, [])

  const addPrizeRow = () => {
    const nextPos = prizes.length > 0 ? Math.max(...prizes.map(p => p.position)) + 1 : 1
    setPrizes(prev => [...prev, { position: nextPos, prize: '' }])
  }

  const removePrizeRow = (idx: number) => {
    setPrizes(prev => prev.filter((_, i) => i !== idx))
  }

  const updatePrize = (idx: number, field: keyof PrizeRow, value: string | number) => {
    setPrizes(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  const ordinalLabel = (n: number) => {
    const labels: Record<number, string> = { 1: '1er', 2: '2do', 3: '3er' }
    return labels[n] ?? `${n}to`
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'El nombre es obligatorio'
    if (duration < 30 || duration > 300) newErrors.duration = 'La duración debe estar entre 30 y 300 segundos'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSaving(true)

    const prizeConfig: Record<string, string> = {}
    prizes.forEach(p => { if (p.prize.trim()) prizeConfig[String(p.position)] = p.prize.trim() })

    const body = {
      name: name.trim(),
      triviaId: triviaId || undefined,
      maxPlayers,
      prizeConfig,
      gameConfig: { duration },
    }

    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success('Torneo creado')
        router.push(`/admin/tournaments/${data.id}`)
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Error al crear torneo')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/tournaments">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-black text-slate-800">Nuevo Torneo</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-700">Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <Label className={errors.name ? 'text-red-500' : ''}>Nombre *</Label>
            <Input
              value={name}
              onChange={e => {
                setName(e.target.value)
                if (e.target.value.trim()) setErrors(errs => { const { name: _, ...rest } = errs; return rest })
              }}
              placeholder="Gran Torneo Automotor 2025"
              aria-invalid={!!errors.name}
              className="mt-1"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Trivia */}
          <div>
            <Label>Trivia asociada (opcional)</Label>
            <Select value={triviaId} onValueChange={(val) => setTriviaId(val ?? '')}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar trivia..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin trivia</SelectItem>
                {trivias.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max players */}
          <div>
            <Label>Máximo de jugadores</Label>
            <Select value={String(maxPlayers)} onValueChange={v => setMaxPlayers(Number(v ?? 16))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 8, 16, 32].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} jugadores</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-700">Configuración de partida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className={errors.duration ? 'text-red-500' : ''}>
              Duración por partida (segundos)
            </Label>
            <Input
              type="number"
              min={30}
              max={300}
              value={duration}
              onChange={e => {
                setDuration(Number(e.target.value))
                setErrors(errs => { const { duration: _, ...rest } = errs; return rest })
              }}
              aria-invalid={!!errors.duration}
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">Entre 30 y 300 segundos. Actual: {duration}s</p>
            {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-700">Premios</CardTitle>
            <Button variant="outline" size="sm" onClick={addPrizeRow}>
              <Plus className="w-3 h-3 mr-1" /> Agregar posición
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
                      onChange={e => updatePrize(idx, 'position', Number(e.target.value))}
                      className="text-center"
                    />
                    <p className="text-xs text-slate-400 text-center mt-0.5">{ordinalLabel(row.position)} lugar</p>
                  </div>
                  <Input
                    value={row.prize}
                    onChange={e => updatePrize(idx, 'prize', e.target.value)}
                    placeholder={`Premio para el ${ordinalLabel(row.position)} lugar`}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                    onClick={() => removePrizeRow(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/admin/tournaments">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {saving ? 'Creando...' : 'Crear Torneo'}
        </Button>
      </div>
    </div>
  )
}
