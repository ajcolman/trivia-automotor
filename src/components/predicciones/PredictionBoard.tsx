// Author: Angel Colman
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Lock, ChevronRight, Trophy, Check, Loader2, AlertCircle, Gift, Ban } from 'lucide-react'
import { ContenderPicker } from './ContenderPicker'
import { CarLoop } from './CarLoop'
import { PhotoZoom } from '@/components/ui/photo-zoom'
import type { ContenderDTO, MarketDTO, PremioDTO } from './tipos'

const TZ = 'America/Asuncion'

const fJornada = new Intl.DateTimeFormat('es-PY', {
  timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long',
})
const fHora = new Intl.DateTimeFormat('es-PY', {
  timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
})

/** Cuánto falta, en palabras. Null si ya pasó. */
function faltan(iso: string, ahora: number): string | null {
  const ms = new Date(iso).getTime() - ahora
  if (ms <= 0) return null
  const min = Math.floor(ms / 60000)
  if (min < 60) return `cierra en ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `cierra en ${h} h`
  return `cierra en ${Math.floor(h / 24)} días`
}

interface Props {
  titulo: string
  reglas: string | null
  colorPrimario: string
  colorSecundario: string
  markets: MarketDTO[]
  contenders: ContenderDTO[]
  premios: PremioDTO[]
}

type EstadoGuardado = 'guardado' | 'guardando' | 'error'

const MEDALLAS = ['🥇', '🥈', '🥉']

export function PredictionBoard({
  titulo, reglas, colorPrimario, colorSecundario, markets, contenders, premios,
}: Props) {
  const [picks, setPicks] = useState<Record<string, MarketDTO['pick']>>(
    () => Object.fromEntries(markets.map(m => [m.id, m.pick])),
  )
  const [estados, setEstados] = useState<Record<string, EstadoGuardado>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [picker, setPicker] = useState<{ marketId: string; slot: number } | null>(null)

  // Se refresca solo para que los mercados se cierren en pantalla sin recargar.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const porId = useMemo(
    () => new Map(contenders.map(c => [c.id, c])), [contenders],
  )

  const guardar = useCallback(async (marketId: string, value: MarketDTO['pick']) => {
    setEstados(e => ({ ...e, [marketId]: 'guardando' }))
    setErrores(e => { const { [marketId]: _, ...resto } = e; return resto })

    const res = await fetch('/api/player/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId, value }),
    }).catch(() => null)

    if (!res || !res.ok) {
      const cuerpo = await res?.json().catch(() => ({}))
      setEstados(e => ({ ...e, [marketId]: 'error' }))
      setErrores(e => ({
        ...e,
        [marketId]: cuerpo?.error ?? 'No se pudo guardar. Revisá tu conexión.',
      }))
      return
    }
    setEstados(e => ({ ...e, [marketId]: 'guardado' }))
  }, [])

  const elegir = useCallback((contenderId: string) => {
    if (!picker) return
    const market = markets.find(m => m.id === picker.marketId)
    if (!market) return

    if (market.type === 'ordered_pick') {
      const posiciones = market.config.positions ?? 3
      const actual = Array.isArray(picks[market.id]) ? [...(picks[market.id] as string[])] : []
      while (actual.length < posiciones) actual.push('')
      actual[picker.slot] = contenderId

      setPicks(p => ({ ...p, [market.id]: actual }))
      setPicker(null)
      // Solo se envía cuando el podio está completo: el servidor rechaza
      // una lista incompleta, y con razón.
      if (actual.every(Boolean)) void guardar(market.id, actual)
      return
    }

    setPicks(p => ({ ...p, [market.id]: contenderId }))
    setPicker(null)
    void guardar(market.id, contenderId)
  }, [picker, markets, picks, guardar])

  const podio = markets.find(m => m.type === 'ordered_pick')
  const tramos = markets.filter(m => m.type === 'single_pick' && m.segment)

  // Agrupados por jornada, en hora de Asunción.
  const jornadas = useMemo(() => {
    const mapa = new Map<string, MarketDTO[]>()
    for (const m of tramos) {
      const iso = m.segment?.startsAt ?? m.locksAt
      const clave = fJornada.format(new Date(iso))
      const lista = mapa.get(clave) ?? []
      lista.push(m)
      mapa.set(clave, lista)
    }
    return Array.from(mapa.entries())
  }, [tramos])

  const jugables = markets.filter(m => !m.segment?.isCancelled)
  const elegidos = jugables.filter(m => {
    const p = picks[m.id]
    return Array.isArray(p) ? p.length > 0 && p.every(Boolean) : p != null
  }).length

  const marketAbierto = picker ? markets.find(m => m.id === picker.marketId) : null
  const bloqueados = marketAbierto?.type === 'ordered_pick' && Array.isArray(picks[marketAbierto.id])
    ? (picks[marketAbierto.id] as string[]).filter((id, i) => Boolean(id) && i !== picker?.slot)
    : []

  return (
    <div className="min-h-screen bg-automotor-950 pb-16">
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${colorPrimario}, ${colorSecundario})` }} />

      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden px-4 pb-8 pt-6"
        style={{ background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})` }}
      >
        {/* El clip conserva todo el desplazamiento del auto, así que se ancla
            al borde derecho sin desbordar por abajo: las ruedas deben verse. */}
        <CarLoop className="pointer-events-none absolute bottom-0 right-0 w-64 opacity-90 sm:w-80" />
        <div className="relative mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-3 inline-flex min-h-[44px] items-center text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white"
          >
            ← Automotor Play
          </Link>
          <h1 className="font-expanded max-w-[16ch] text-2xl font-black leading-tight text-white text-balance sm:text-3xl">
            {titulo}
          </h1>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
            <Check className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">{elegidos}</span> de{' '}
            <span className="tabular-nums">{jugables.length}</span> cargadas
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        {reglas && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-automotor-200">
            {reglas}
          </p>
        )}

        {/* ── Premios ────────────────────────────────────────────── */}
        {premios.length > 0 && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-amber-200/30 bg-amber-50/95">
            <h2 className="flex items-center gap-2 border-b border-amber-200/60 px-4 py-2.5 text-sm font-black uppercase tracking-wider text-amber-800">
              <Gift className="h-4 w-4" aria-hidden="true" /> Ganate esto
            </h2>
            <ul className="divide-y divide-amber-200/50">
              {premios.map((pr, i) => (
                <li key={pr.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-7 flex-shrink-0 text-center text-lg leading-none">
                    {i < 3 ? MEDALLAS[i] : (
                      <span className="text-xs font-bold text-amber-700 tabular-nums">{pr.position}</span>
                    )}
                  </span>
                  {pr.imageUrl && (
                    <PhotoZoom
                      src={pr.imageUrl}
                      alt={pr.name}
                      className="h-11 w-11 flex-shrink-0"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-slate-800">{pr.name}</span>
                    {pr.description && (
                      <span className="block truncate text-xs text-slate-600">{pr.description}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Podio ──────────────────────────────────────────────── */}
        {podio && (
          <section className="mt-6">
            <h2 className="font-expanded mb-3 flex items-center gap-2 text-lg font-black text-white">
              <Trophy className="h-5 w-5 text-brand-accent" aria-hidden="true" />
              {podio.title}
            </h2>
            <Card
              market={podio}
              ahora={ahora}
              estado={estados[podio.id]}
              error={errores[podio.id]}
            >
              <ol className="space-y-2">
                {Array.from({ length: podio.config.positions ?? 3 }).map((_, i) => {
                  const lista = Array.isArray(picks[podio.id]) ? (picks[podio.id] as string[]) : []
                  const elegido = lista[i] ? porId.get(lista[i]) : null
                  const cerrado = new Date(podio.locksAt).getTime() <= ahora
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={cerrado}
                        onClick={() => setPicker({ marketId: podio.id, slot: i })}
                        className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 border-slate-200 px-3 text-left transition-colors hover:border-automotor-400 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-700 tabular-nums">
                          {i + 1}°
                        </span>
                        {elegido ? (
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold text-slate-900">{elegido.name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {elegido.number ? `#${elegido.number} · ` : ''}{elegido.category}
                            </span>
                          </span>
                        ) : (
                          <span className="flex-1 text-sm text-slate-400">Elegir tripulación</span>
                        )}
                        {!cerrado && <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </Card>
          </section>
        )}

        {/* ── Tramos por jornada ─────────────────────────────────── */}
        {jornadas.map(([jornada, lista]) => (
          <section key={jornada} className="mt-8">
            <h2 className="font-expanded mb-3 text-lg font-black capitalize text-white">{jornada}</h2>
            <ul className="space-y-2.5">
              {lista.map((m: MarketDTO) => {
                const cancelado = m.segment?.isCancelled ?? false
                const cerrado = cancelado || new Date(m.locksAt).getTime() <= ahora
                const elegido = typeof picks[m.id] === 'string' ? porId.get(picks[m.id] as string) : null
                return (
                  <li key={m.id}>
                    <Card market={m} ahora={ahora} estado={estados[m.id]} error={errores[m.id]}>
                      <button
                        type="button"
                        disabled={cerrado}
                        onClick={() => setPicker({ marketId: m.id, slot: 0 })}
                        className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 border-slate-200 px-3 text-left transition-colors hover:border-automotor-400 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300"
                      >
                        {elegido ? (
                          <>
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-automotor-600 text-sm font-black text-white tabular-nums">
                              {elegido.number ?? '—'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-bold text-slate-900">{elegido.name}</span>
                              <span className="block truncate text-xs text-slate-500">{elegido.category}</span>
                            </span>
                          </>
                        ) : (
                          <span className="flex-1 text-sm text-slate-400">
                            {cancelado
                              ? 'Tramo cancelado'
                              : cerrado ? 'No cargaste predicción' : 'Elegir ganador'}
                          </span>
                        )}
                        {!cerrado && <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />}
                      </button>
                    </Card>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <ContenderPicker
        abierto={picker !== null}
        titulo={marketAbierto?.title ?? ''}
        contenders={contenders}
        bloqueados={bloqueados}
        seleccionado={
          marketAbierto?.type === 'ordered_pick'
            ? ((picks[marketAbierto.id] as string[])?.[picker?.slot ?? 0] ?? null)
            : (picks[marketAbierto?.id ?? ''] as string) ?? null
        }
        onElegir={elegir}
        onCerrar={() => setPicker(null)}
      />
    </div>
  )
}

/** Envoltura de un mercado: cabecera con estado de cierre y aviso de guardado. */
function Card({
  market, ahora, estado, error, children,
}: {
  market: MarketDTO
  ahora: number
  estado?: EstadoGuardado
  error?: string
  children: React.ReactNode
}) {
  const cancelado = market.segment?.isCancelled ?? false
  const cerrado = cancelado || new Date(market.locksAt).getTime() <= ahora
  const restante = faltan(market.locksAt, ahora)
  const puntos =
    market.type === 'ordered_pick'
      ? market.config.exactAllPoints
      : market.config.points

  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-lg shadow-automotor-950/40">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {market.segment ? (
            <p className="truncate text-sm font-bold text-slate-900">
              <span className="text-automotor-600">{market.segment.code}</span>{' '}
              {market.segment.name}
            </p>
          ) : (
            <p className="truncate text-sm font-bold text-slate-900">{market.title}</p>
          )}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            {market.segment?.distanceKm != null && (
              <span className="tabular-nums">{market.segment.distanceKm} km</span>
            )}
            <span className="tabular-nums">{fHora.format(new Date(market.locksAt))}</span>
            {puntos != null && (
              <span className="font-bold text-brand-accent tabular-nums">{puntos} pts</span>
            )}
          </p>
        </div>

        {cancelado ? (
          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
            <Ban className="h-3 w-3" aria-hidden="true" /> Cancelado
          </span>
        ) : cerrado ? (
          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Lock className="h-3 w-3" aria-hidden="true" /> Cerrado
          </span>
        ) : (
          restante && (
            <span className="flex-shrink-0 rounded-full bg-automotor-50 px-2.5 py-1 text-[11px] font-bold text-automotor-700">
              {restante}
            </span>
          )
        )}
      </div>

      {children}

      <div aria-live="polite" className="min-h-[20px]">
        {estado === 'guardando' && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Guardando…
          </p>
        )}
        {estado === 'guardado' && !error && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-green-700">
            <Check className="h-3 w-3" aria-hidden="true" /> Guardado
          </p>
        )}
        {error && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-red-600">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> {error}
          </p>
        )}
      </div>
    </div>
  )
}
