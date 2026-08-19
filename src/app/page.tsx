// Author: Angel Colman
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { Trophy, Users, Zap, ChevronRight, Clock, Award, Gift, UserRound, Flag, Gamepad2 } from 'lucide-react'
import { formatDateShort, getNowAsuncion, mediaUrl, stripMarkdown } from '@/lib/utils'
import { PrizesModal } from '@/components/landing/PrizesModal'
import { ArcadeCabinet } from '@/components/landing/ArcadeCabinet'
import { RankingModal, type FilaRankingPublica } from '@/components/landing/RankingModal'
import { CarLoop } from '@/components/predicciones/CarLoop'
import {
  heroBackgroundImageStyle,
  heroOverlayGradient,
  heroTextOutlineStyle,
  resolveHeroImageSettings,
} from '@/lib/hero-image'

export const revalidate = 60

const MEDALS = ['🥇', '🥈', '🥉']

/** "Juan Carlos Pérez" -> "Juan P." — la tabla es pública. */
function abreviarNombre(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  return partes.length > 1
    ? `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`
    : partes[0]
}

/**
 * Fila de ranking de una trivia. El nombre vive en `formData`, que cada trivia
 * arma con sus propios campos, de ahí el rastreo de claves alternativas.
 */
function rankingTrivia(trivia: {
  leads: { formData: unknown; score: number; maxScore: number }[]
}): FilaRankingPublica[] {
  return trivia.leads.map(lead => {
    const datos = (lead.formData ?? {}) as Record<string, string>
    const nombre = datos.nombre ?? datos.name ?? 'Participante'
    const apellido = datos.apellido ?? datos.lastName ?? ''
    const inicial = apellido ? ` ${apellido[0].toUpperCase()}.` : ''
    const pct = lead.maxScore > 0 ? Math.round((lead.score / lead.maxScore) * 100) : 0
    return {
      nombre: `${nombre.split(' ')[0]}${inicial}`,
      puntos: lead.score,
      detalle: `${pct}% correctas`,
    }
  })
}

/**
 * Marca "Play" de Automotor Play: triángulo de play con esquinas redondeadas
 * dentro de un anillo grueso abierto — el mismo lenguaje del monograma "Am"
 * de Automotor (anillo que se interrumpe donde la forma lo atraviesa).
 * La abertura del anillo queda a la derecha, hacia donde apunta el play.
 * Hereda `currentColor` para adaptarse al contexto (nav claro / footer oscuro).
 */
function PlayMark({ className, ring = true }: { className?: string; ring?: boolean }) {
  return (
    <svg viewBox={ring ? '0 0 100 100' : '32 26 48 48'} className={className} aria-hidden="true" focusable="false">
      {/* Anillo abierto (gap de ~52° hacia el este) */}
      {ring && (
        <path
          d="M 85.96 67.53 A 40 40 0 1 1 85.96 32.47"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
        />
      )}
      {/* Triángulo de play con vértices redondeados, apuntando a la abertura */}
      <path
        d="M 42 35 L 70 50 L 42 65 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinejoin="round"
      />
    </svg>
  )
}

async function getLandingData() {
  const now = getNowAsuncion()
  const activeTrivias = await prisma.trivia.findMany({
    where: {
      isActive: true, isPublic: true,
      AND: [
        { OR: [{ endDate: null }, { endDate: { gt: now } }] },
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { name: true, logoUrl: true } },
      brands: { select: { name: true, logoUrl: true }, take: 1 },
      prizes: { orderBy: { position: 'asc' } },
      flyers: { where: { isActive: true }, take: 1 },
      _count: { select: { leads: true, questions: true } },
      leads: {
        orderBy: [{ score: 'desc' }, { completedAt: 'asc' }],
        take: 20,
        select: { formData: true, score: true, maxScore: true },
      },
    },
  })
  // Ranking por evento de predicción: lo mismo que ve el jugador dentro, pero
  // accesible desde la sala sin tener que entrar al juego.
  // Juegos de predicción abiertos. Los que están en borrador no se muestran.
  const predictionEvents = await prisma.predictionEvent.findMany({
    where: { status: { in: ['open', 'live'] } },
    orderBy: { closesAt: 'asc' },
    select: {
      id: true, slug: true, title: true, description: true, status: true,
      showLeaderboard: true,
      primaryColor: true, secondaryColor: true, heroImageUrl: true,
      prizes: {
        orderBy: { position: 'asc' },
        select: { id: true, name: true, description: true, imageUrl: true, position: true },
      },
      _count: { select: { markets: true, contenders: true } },
    },
  })

  // Fútbol es una máquina permanente de la sala: aunque no haya torneos con
  // inscripción abierta, el modo local (dos jugadores, misma pantalla) está
  // siempre disponible. El conteo solo decide qué copy mostrar.
  const pendingTournaments = await prisma.tournament.count({ where: { status: 'pending' } })

  // Ranking de cada máquina, para el botón del gabinete. Es la misma tabla
  // que ve el jugador dentro del juego, con los nombres abreviados: se mira
  // desde la sala sin tener que entrar a jugar.
  const rankingPredicciones = new Map<string, FilaRankingPublica[]>()
  for (const evento of predictionEvents) {
    // Con el ranking apagado desde el admin el gabinete no lleva botón, así
    // que tampoco hace falta recorrer las predicciones del evento.
    if (!evento.showLeaderboard) continue
    const predicciones = await prisma.prediction.findMany({
      where: { market: { eventId: evento.id } },
      select: { playerId: true, pointsAwarded: true, player: { select: { fullName: true } } },
    })
    const porJugador = new Map<string, { nombre: string; puntos: number; acertadas: number }>()
    for (const pred of predicciones) {
      const fila = porJugador.get(pred.playerId) ?? { nombre: pred.player.fullName, puntos: 0, acertadas: 0 }
      if (pred.pointsAwarded != null) {
        fila.puntos += pred.pointsAwarded
        if (pred.pointsAwarded > 0) fila.acertadas++
      }
      porJugador.set(pred.playerId, fila)
    }
    rankingPredicciones.set(
      evento.id,
      Array.from(porJugador.values())
        .sort((a, b) => b.puntos - a.puntos || b.acertadas - a.acertadas)
        .slice(0, 20)
        .map(f => ({
          nombre: abreviarNombre(f.nombre),
          puntos: f.puntos,
          detalle: `${f.acertadas} acierto${f.acertadas !== 1 ? 's' : ''}`,
        })),
    )
  }

  // Fútbol: solo hay tabla si se jugaron partidos de torneo. El modo local no
  // deja marcador, así que sin partidos terminados la máquina no lleva botón.
  const partidos = await prisma.tournamentMatch.findMany({
    where: { status: 'finished' },
    select: {
      scoreP1: true, scoreP2: true, winnerId: true,
      player1: { select: { id: true, playerName: true } },
      player2: { select: { id: true, playerName: true } },
    },
  })
  const porParticipante = new Map<string, { nombre: string; victorias: number; goles: number }>()
  for (const m of partidos) {
    for (const [jugador, goles] of [[m.player1, m.scoreP1], [m.player2, m.scoreP2]] as const) {
      const fila = porParticipante.get(jugador.id) ?? { nombre: jugador.playerName, victorias: 0, goles: 0 }
      fila.goles += goles
      if (m.winnerId === jugador.id) fila.victorias++
      porParticipante.set(jugador.id, fila)
    }
  }
  const rankingFutbol: FilaRankingPublica[] = Array.from(porParticipante.values())
    .sort((a, b) => b.victorias - a.victorias || b.goles - a.goles)
    .slice(0, 20)
    .map(f => ({
      nombre: abreviarNombre(f.nombre),
      puntos: f.victorias,
      detalle: `${f.goles} gol${f.goles !== 1 ? 'es' : ''} a favor`,
    }))

  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
  })
  return { activeTrivias, predictionEvents, pendingTournaments, rankingPredicciones, rankingFutbol, settings }
}

export default async function HomePage() {
  const { activeTrivias, predictionEvents, pendingTournaments, rankingPredicciones, rankingFutbol, settings } = await getLandingData()
  const totalParticipants = activeTrivias.reduce((s, t) => s + t._count.leads, 0)
  const totalPrizes = activeTrivias.reduce((s, t) => s + t.prizes.length, 0)
  // Máquinas en sala: los juegos de la base más fútbol, que está siempre.
  const machines = predictionEvents.length + activeTrivias.length + 1

  const heroImg = settings?.heroImageUrl ? mediaUrl(settings.heroImageUrl) : '/images/fondo.png'
  const heroSet = resolveHeroImageSettings(settings?.heroImageSettings as any, 620)
  const canRevealLandingHero = Boolean(settings?.heroImageUrl && heroSet.hideContentOnFocus)

  return (
    <div className="min-h-screen bg-automotor-950 flex flex-col">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-automotor-100 shadow-sm">
        {/* Filete de marca */}
        <div className="h-1 bg-gradient-brand" aria-hidden="true" />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          {/* Lockup Automotor Play: un solo link, un solo nombre accesible.
              `min-w-0` deja que se encoja antes de empujar al botón de cuenta. */}
          <Link
            href="/"
            aria-label="Automotor Play — inicio"
            className="flex min-h-[44px] min-w-0 items-center gap-2"
          >
            <Image
              src="/uploads/logoa.png"
              alt=""
              aria-hidden="true"
              width={160}
              height={52}
              className="h-7 w-auto flex-shrink object-contain sm:h-8"
              unoptimized
            />
            <span aria-hidden="true" className="-ml-1 flex items-center gap-1.5 text-automotor-600">
              <PlayMark className="h-6 w-6 flex-shrink-0 sm:h-7 sm:w-7" />
              <span className="font-expanded text-lg font-black leading-none tracking-tight sm:text-xl">
                Play
              </span>
            </span>
          </Link>

          <div className="flex flex-shrink-0 items-center gap-1">
            {/* `/cuenta` redirige a iniciar sesión si no hay jugador, así el
                nav no depende de la sesión y la landing sigue siendo estática.
                En pantallas chicas queda solo el ícono: el texto competía con
                el lockup y terminaba partido en dos líneas. */}
            <Link
              href="/cuenta"
              aria-label="Mi cuenta"
              className="inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-full bg-automotor-600 px-3 text-sm font-bold text-white transition-colors hover:bg-automotor-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300 motion-reduce:transition-none sm:px-4"
            >
              <UserRound className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="hidden whitespace-nowrap sm:inline">Mi cuenta</span>
            </Link>
            {/* El acceso al panel es para el equipo, no para el cliente: en
                mobile vive en el pie y libera el poco ancho que hay arriba. */}
            <Link
              href="/admin/login"
              className="-mr-3 hidden min-h-[44px] items-center gap-1 px-3 text-xs font-semibold text-slate-400 transition-colors hover:text-automotor-600 motion-reduce:transition-none sm:inline-flex"
            >
              Admin <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-grow">
        {/* ── HERO ────────────────────────────────────────────────────── */}
        <header
          className={`relative overflow-hidden ${canRevealLandingHero ? 'group focus:outline-none focus:ring-2 focus:ring-automotor-300 focus:ring-inset' : ''}`}
          tabIndex={canRevealLandingHero ? 0 : undefined}
          aria-label={canRevealLandingHero ? 'Ver fondo de cabecera' : undefined}
          style={{ minHeight: `${heroSet.height}px`, display: 'flex', alignItems: 'center', cursor: canRevealLandingHero ? 'zoom-in' : undefined }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0"
            style={settings?.heroImageUrl
              ? heroBackgroundImageStyle(heroSet, heroImg)
              : {
                backgroundImage: `url(${heroImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center bottom',
                backgroundRepeat: 'no-repeat',
              }}
          />
          {/* Overlay: opaco arriba (texto legible) → transparente abajo (autos visibles) */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none ${canRevealLandingHero ? 'group-hover:opacity-0 group-focus:opacity-0' : ''}`}
            style={{
              background: settings?.heroImageUrl
                ? heroOverlayGradient(heroSet, 'landing')
                : 'linear-gradient(180deg, rgba(2,31,57,0.92) 0%, rgba(0,64,113,0.80) 35%, rgba(3,49,86,0.45) 65%, rgba(2,31,57,0.15) 100%)',
            }}
          />
          {/* Scanlines retro */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-300 motion-reduce:transition-none ${canRevealLandingHero ? 'group-hover:opacity-0 group-focus:opacity-0' : ''}`}
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
            }}
          />
          {/* Fade al fondo azul profundo de la página */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-32 pointer-events-none transition-opacity duration-300 motion-reduce:transition-none ${canRevealLandingHero ? 'group-hover:opacity-0 group-focus:opacity-0' : ''}`}
            style={{
              background: 'linear-gradient(to bottom, transparent, #021F39)',
            }}
          />

          {/* Contenido alineado arriba para dejar los autos visibles abajo */}
          <div className={`relative w-full max-w-6xl mx-auto px-4 pt-14 pb-28 sm:pt-16 sm:pb-36 lg:pt-20 lg:pb-52 text-center transition-all duration-300 motion-reduce:transition-none ${canRevealLandingHero ? 'group-hover:opacity-0 group-hover:translate-y-3 group-hover:scale-[0.98] group-focus:opacity-0 group-focus:translate-y-3 group-focus:scale-[0.98]' : ''}`}>
            <p className="text-automotor-300 text-xs sm:text-sm font-black uppercase tracking-[0.2em] mb-3 drop-shadow" style={heroTextOutlineStyle(heroSet, 0.45)}>
              Automotor Play
            </p>
            <h1 className="font-expanded text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 tracking-tight leading-tight drop-shadow-lg text-balance" style={heroTextOutlineStyle(heroSet)}>
              Jugá y <span className="text-brand-accent-light">ganá</span>
            </h1>
            <p className="text-base sm:text-lg text-white/85 mb-8 max-w-md mx-auto drop-shadow text-balance" style={heroTextOutlineStyle(heroSet, 0.45)}>
              Jugá, sumá puntos y llevate premios y merch oficial de Automotor.
            </p>

            {/* CTA principal: a elegir trivia */}
            <a
              href="#trivias"
              className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[linear-gradient(135deg,#FB923C,#F97316)] px-8 py-3.5 text-base sm:text-lg font-black text-automotor-950 shadow-accent hover:brightness-105 hover:scale-[1.03] transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              Jugar ahora <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </a>

            {/* Stats pills */}
            <div className="mt-8 flex flex-wrap justify-center gap-2.5 sm:gap-3">
              {[
                { icon: <Users className="w-4 h-4" />, value: `${totalParticipants.toLocaleString()}`, label: 'participantes' },
                { icon: <Zap className="w-4 h-4" />, value: `${activeTrivias.length}`, label: 'juegos activos' },
                { icon: <Award className="w-4 h-4" />, value: `${totalPrizes}`, label: 'premios en juego' },
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex min-h-[44px] items-center gap-2 bg-automotor-950/40 border border-white/15 rounded-full px-4 sm:px-5 py-2.5 text-white backdrop-blur-sm shadow-lg hover:bg-automotor-950/55 hover:border-white/25 transition-all duration-300 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 group"
                >
                  <span className="text-automotor-300 group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform">{s.icon}</span>
                  <span className="font-black text-lg tracking-tight tabular-nums">{s.value}</span>
                  <span className="text-white/70 text-xs font-bold uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── CÓMO FUNCIONA ───────────────────────────────────────────── */}
        <section aria-label="Cómo funciona" className="max-w-6xl mx-auto px-4 pt-8 sm:pt-10">
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ['Elegí tu juego', 'Cada uno tiene sus propios premios.'],
              ['Jugá y sumá puntos', 'Rápido y desde el celular.'],
              ['Ganá premios y merch', 'Los mejores del ranking se los llevan.'],
            ].map(([title, detail], i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5">
                <span className="w-9 h-9 flex-shrink-0 rounded-full bg-[linear-gradient(135deg,#FB923C,#F97316)] text-automotor-950 font-black flex items-center justify-center tabular-nums" aria-hidden="true">
                  {i + 1}
                </span>
                <p className="text-sm leading-snug text-automotor-200">
                  <strong className="block text-white">{title}</strong>
                  {detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── SALA DE JUEGOS ──────────────────────────────────────────── */}
        <main id="trivias" className="max-w-6xl mx-auto px-4 py-10 sm:py-12 scroll-mt-20">
          <div className="flex items-center justify-between gap-3 mb-7 sm:mb-8">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-automotor-500 shadow-glow flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-expanded text-xl sm:text-2xl font-black text-white leading-none truncate">
                  Sala de juegos
                </h2>
                <p className="text-automotor-300 text-xs mt-1">
                  Cada máquina se juega distinto: la marquesina te dice cómo.
                </p>
              </div>
            </div>
            <span className="flex-shrink-0 text-xs font-bold text-automotor-200 bg-white/10 border border-white/10 rounded-full px-2.5 py-1 tabular-nums">
              {machines} máquina{machines !== 1 ? 's' : ''}
            </span>
          </div>

          {/* La sala: fila de máquinas que envuelve y se centra. Con una
              máquina queda una pieza centrada e intencional; con diez se
              arma la sala en filas de a tres. En el celular apilan a ancho
              completo. Cada gabinete es chrome de plataforma; los colores
              del juego mandan solo en su pantalla (ver ArcadeCabinet). */}
          <ul role="list" className="flex flex-wrap justify-center gap-5 sm:gap-6">
            {predictionEvents.map(evento => (
              <ArcadeCabinet
                key={evento.id}
                typeLabel="Predicciones"
                typeAccent="text-brand-accent"
                typeIcon={<Flag className="h-3.5 w-3.5" aria-hidden="true" />}
                badge={evento.status === 'live' ? (
                  <span className="rounded-full bg-brand-accent px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-automotor-950">
                    En vivo
                  </span>
                ) : undefined}
                screen={
                  <div
                    className="relative h-40 p-4"
                    style={{ background: `linear-gradient(135deg, ${evento.primaryColor}, ${evento.secondaryColor})` }}
                  >
                    <h3 className="font-expanded relative z-10 max-w-[13rem] text-xl font-black leading-tight text-white text-balance">
                      {evento.title}
                    </h3>
                    {/* El i20 N como ícono de marca Automotor. CarLoop trae
                        el loop en video (372 KB) con `mix-blend-mode: screen`
                        mezclando directo contra el degradado del juego -- sin
                        envoltorio con fondo propio, ver CarLoop.tsx. Con
                        reduced-motion, ahorro de datos o conexión lenta cae
                        solo al sprite fijo. */}
                    <CarLoop className="pointer-events-none absolute -bottom-1 -right-2 w-44 opacity-90 transition-transform duration-500 group-hover:translate-x-2 motion-reduce:transition-none" />
                  </div>
                }
              >
                {evento.description && (
                  <p className="text-sm leading-relaxed text-automotor-200 line-clamp-2">
                    {evento.description}
                  </p>
                )}

                {/* Premios del evento: mismo panel ámbar que las trivias.
                    Hoy puede venir vacío -- apenas se carguen, aparece. */}
                {evento.prizes.length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200/40 bg-amber-50/95 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700 mb-2">
                      <Gift className="w-3.5 h-3.5" aria-hidden="true" /> Ganate esto
                    </p>
                    <ul className="space-y-2">
                      {evento.prizes.slice(0, 3).map(prize => (
                        <li key={prize.id} className="flex items-center gap-2.5 min-w-0">
                          {prize.imageUrl ? (
                            <Image
                              src={mediaUrl(prize.imageUrl)}
                              alt=""
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-lg object-cover border border-amber-200 bg-white flex-shrink-0"
                              unoptimized
                            />
                          ) : (
                            <span className="w-10 h-10 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-lg flex-shrink-0" aria-hidden="true">
                              {MEDALS[prize.position - 1] ?? '🎁'}
                            </span>
                          )}
                          <span className="text-sm font-bold text-slate-800 truncate">{prize.name}</span>
                          <span className="ml-auto flex-shrink-0 text-[10px] font-black text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 tabular-nums">
                            {prize.position}°
                          </span>
                        </li>
                      ))}
                    </ul>
                    {evento.prizes.length > 3 && (
                      <div className="mt-2.5">
                        <PrizesModal
                          prizes={evento.prizes}
                          primaryColor={evento.primaryColor}
                          secondaryColor={evento.secondaryColor}
                          triviaTitle={evento.title}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <div className="mb-3 flex items-center gap-4 text-xs font-bold text-automotor-300/80">
                    <span className="tabular-nums">{evento._count.markets} predicciones</span>
                    <span className="tabular-nums">{evento._count.contenders} equipos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/predicciones/${evento.slug}`}
                      className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-base font-black text-white shadow-lg transition-all duration-300 hover:brightness-110 hover:gap-3 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300 focus-visible:ring-offset-2 focus-visible:ring-offset-automotor-900"
                      style={{ background: `linear-gradient(135deg, ${evento.primaryColor}, ${evento.secondaryColor})` }}
                    >
                      Jugar ahora <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </Link>
                    {/* Si el juego esconde su tabla, tampoco se muestra acá. */}
                    {evento.showLeaderboard && (
                      <RankingModal
                        titulo={evento.title}
                        filas={rankingPredicciones.get(evento.id) ?? []}
                        colorAcento={evento.primaryColor}
                      />
                    )}
                  </div>
                </div>
              </ArcadeCabinet>
            ))}

            {activeTrivias.map(trivia => {
              const flyer = trivia.flyers[0]
              const logo = mediaUrl(trivia.logoUrl ?? trivia.company?.logoUrl ?? trivia.brands[0]?.logoUrl)

              return (
                <ArcadeCabinet
                  key={trivia.id}
                  typeLabel="Trivia"
                  typeAccent="text-automotor-300"
                  typeIcon={<Zap className="h-3.5 w-3.5" aria-hidden="true" />}
                  badge={trivia.endDate ? (
                    <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-automotor-200">
                      <Clock className="h-3 w-3" aria-hidden="true" /> hasta {formatDateShort(trivia.endDate)}
                    </span>
                  ) : undefined}
                  screen={
                    <div className="relative h-40">
                      {flyer ? (
                        <Image src={mediaUrl(flyer.imageUrl)} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center pb-8"
                          style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                        >
                          <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                          {logo ? (
                            <Image src={logo} alt="" width={140} height={56} className="relative h-12 w-auto object-contain drop-shadow-lg" unoptimized />
                          ) : (
                            <Trophy className="relative w-12 h-12 text-white/40" aria-hidden="true" />
                          )}
                        </div>
                      )}
                      {/* Escrima inferior: el título siempre se lee sobre
                          flyer o degradado, sin depender de la imagen. */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-4 pt-8">
                        <h3 className="font-expanded text-lg font-black leading-tight text-white text-balance">
                          {trivia.title}
                        </h3>
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {trivia.company && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: trivia.primaryColor }}>
                        {trivia.company.name}
                      </span>
                    )}
                    {trivia.brands[0] && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-automotor-200">
                        {trivia.brands[0].name}
                      </span>
                    )}
                  </div>

                  {trivia.description && (
                    <p className="text-sm leading-relaxed text-automotor-200 line-clamp-2">{stripMarkdown(trivia.description)}</p>
                  )}

                  {/* Premios: protagonistas, a la vista. Panel claro sobre la
                      base oscura -- el mismo patrón ámbar del tablero de
                      predicciones, y así el disparador del modal (que se
                      colorea con primaryColor) sigue siendo legible. */}
                  {trivia.prizes.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-200/40 bg-amber-50/95 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700 mb-2">
                        <Gift className="w-3.5 h-3.5" aria-hidden="true" /> Ganate esto
                      </p>
                      <ul className="space-y-2">
                        {trivia.prizes.slice(0, 3).map(prize => (
                          <li key={prize.id} className="flex items-center gap-2.5 min-w-0">
                            {prize.imageUrl ? (
                              <Image
                                src={mediaUrl(prize.imageUrl)}
                                alt=""
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-lg object-cover border border-amber-200 bg-white flex-shrink-0"
                                unoptimized
                              />
                            ) : (
                              <span className="w-10 h-10 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-lg flex-shrink-0" aria-hidden="true">
                                {MEDALS[prize.position - 1] ?? '🎁'}
                              </span>
                            )}
                            <span className="text-sm font-bold text-slate-800 truncate">{prize.name}</span>
                            <span className="ml-auto flex-shrink-0 text-[10px] font-black text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 tabular-nums">
                              {prize.position}°
                            </span>
                          </li>
                        ))}
                      </ul>
                      {trivia.prizes.length > 3 && (
                        <div className="mt-2.5">
                          <PrizesModal
                            prizes={trivia.prizes}
                            primaryColor={trivia.primaryColor}
                            secondaryColor={trivia.secondaryColor}
                            triviaTitle={trivia.title}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-automotor-300/80 mb-3">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="tabular-nums">{trivia._count.leads} ya jugaron</span>
                      </span>
                      <span className="tabular-nums">{trivia._count.questions} preguntas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/play/${trivia.slug}`}
                        className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-base font-black text-white shadow-lg transition-all duration-300 hover:brightness-110 hover:gap-3 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300 focus-visible:ring-offset-2 focus-visible:ring-offset-automotor-900"
                        style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                      >
                        Jugar ahora <ChevronRight className="w-5 h-5" aria-hidden="true" />
                      </Link>
                      {/* Si la trivia esconde su tabla, tampoco se muestra acá. */}
                      {trivia.showLeaderboard !== false && (
                        <RankingModal
                          titulo={trivia.title}
                          filas={rankingTrivia(trivia)}
                          colorAcento={trivia.primaryColor}
                        />
                      )}
                    </div>
                  </div>
                </ArcadeCabinet>
              )
            })}

            {/* ── FÚTBOL: máquina permanente de la sala ─────────────────
                No depende de la base: con torneos abiertos invita a
                inscribirse, sin torneos ofrece el modo local (dos jugadores
                en la misma pantalla), que está siempre disponible. Conserva
                la identidad retro-mono de /futbol en su pantalla. */}
            <ArcadeCabinet
              typeLabel="Fútbol"
              typeAccent="text-green-400"
              typeIcon={<span className="text-[13px] leading-none" aria-hidden="true">⚽</span>}
              badge={pendingTournaments > 0 ? (
                <span className="rounded-full bg-green-400/90 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-automotor-950">
                  Inscripción abierta
                </span>
              ) : undefined}
              screen={
                <div
                  className="relative flex h-40 flex-col items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #0a1628 100%)' }}
                >
                  <span className="text-5xl drop-shadow" aria-hidden="true">⚽</span>
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-sky-300">
                    Torneos Automotor
                  </span>
                  <div className="flex w-40 items-center gap-2" aria-hidden="true">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sky-500/40" />
                    <div className="h-1.5 w-1.5 rotate-45 bg-sky-500" />
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sky-500/40" />
                  </div>
                </div>
              }
            >
              <p className="text-sm leading-relaxed text-automotor-200 line-clamp-2">
                {pendingTournaments > 0
                  ? `${pendingTournaments} torneo${pendingTournaments !== 1 ? 's' : ''} con inscripción abierta. Elegí tu vehículo y metele goles al rival.`
                  : 'Fútbol con los vehículos Automotor. Modo local siempre abierto: dos jugadores en la misma pantalla.'}
              </p>
              <div className="mt-auto pt-4">
                <div className="flex items-center gap-4 text-xs font-bold text-automotor-300/80 mb-3">
                  <span>WASD y flechas</span>
                  <span>Gamepad compatible</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/futbol"
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-base font-black text-white shadow-lg transition-all duration-300 hover:brightness-110 hover:gap-3 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-automotor-300 focus-visible:ring-offset-2 focus-visible:ring-offset-automotor-900"
                    style={{ background: 'linear-gradient(135deg, #1a3a1a, #2d6e2d)' }}
                  >
                    Jugar ahora <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </Link>
                  {rankingFutbol.length > 0 && (
                    <RankingModal titulo="Torneos Automotor" filas={rankingFutbol} colorAcento="#2d6e2d" />
                  )}
                </div>
              </div>
            </ArcadeCabinet>

            {/* ── Gabinete apagado: la sala recién arranca ──────────────
                Con menos de tres máquinas, el lugar reservado dice que la
                sala crece -- mejor que dos tercios de grilla vacía. */}
            {machines < 3 && (
              <ArcadeCabinet
                dimmed
                typeLabel="Próximamente"
                typeAccent="text-white/40"
                typeIcon={<PlayMark ring={false} className="h-3.5 w-3.5" />}
                screen={
                  <div className="relative flex h-40 items-center justify-center bg-automotor-950/70">
                    <PlayMark className="h-16 w-16 text-white/15" />
                  </div>
                }
              >
                <p className="text-sm leading-relaxed text-automotor-200/80">
                  Hay un lugar reservado en la sala: la próxima máquina está en preparación.
                </p>
                <div className="mt-auto pt-4">
                  <div className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-dashed border-white/20 text-sm font-bold text-white/40">
                    Muy pronto
                  </div>
                </div>
              </ArcadeCabinet>
            )}
          </ul>
        </main>

      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="mt-14 border-t border-white/10 bg-automotor-950">
        <div className="h-1 bg-gradient-brand" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Lockup sobre chip blanco para conservar el logo original */}
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2" role="img" aria-label="Automotor Play">
            <Image src="/uploads/logoa.png" alt="" aria-hidden="true" width={120} height={40} className="h-6 w-auto object-contain" unoptimized />
            <span aria-hidden="true" className="-ml-0.5 flex items-center gap-1 text-automotor-600">
              <PlayMark className="h-5 w-5" />
              <span className="font-expanded font-black text-base tracking-tight leading-none">Play</span>
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-automotor-200">
            <Link href="/terminos" className="underline-offset-2 hover:text-white hover:underline">
              Bases y condiciones
            </Link>
            <Link href="/privacidad" className="underline-offset-2 hover:text-white hover:underline">
              Política de privacidad
            </Link>
            {/* En mobile el nav no lo muestra: acá queda accesible para el equipo. */}
            <Link href="/admin/login" className="underline-offset-2 hover:text-white hover:underline sm:hidden">
              Panel admin
            </Link>
          </nav>
          <p className="text-xs text-automotor-200 text-center">
            © {new Date().getFullYear()} Automotor S.A. / Carmotor S.A. · Desarrollado por{' '}
            <strong className="text-white/90">Business Intelligence & Analytics - Marketing Digital</strong>
          </p>
        </div>
      </footer>
    </div>
  )
}
