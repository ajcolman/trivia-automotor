// Author: Angel Colman
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { Trophy, Users, Zap, ChevronRight, Clock, Award, Medal, Gift, UserRound } from 'lucide-react'
import { formatDateShort, getNowAsuncion, mediaUrl, stripMarkdown } from '@/lib/utils'
import { PrizesModal } from '@/components/landing/PrizesModal'
import { CarLoop } from '@/components/predicciones/CarLoop'
import {
  heroBackgroundImageStyle,
  heroOverlayGradient,
  heroTextOutlineStyle,
  resolveHeroImageSettings,
} from '@/lib/hero-image'

export const revalidate = 60

const MEDALS = ['🥇', '🥈', '🥉']

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
        take: 5,
        select: { formData: true, score: true, maxScore: true },
      },
    },
  })
  // Juegos de predicción abiertos. Los que están en borrador no se muestran.
  const predictionEvents = await prisma.predictionEvent.findMany({
    where: { status: { in: ['open', 'live'] } },
    orderBy: { closesAt: 'asc' },
    select: {
      id: true, slug: true, title: true, description: true, status: true,
      primaryColor: true, secondaryColor: true, heroImageUrl: true,
      _count: { select: { markets: true, contenders: true } },
    },
  })

  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
  })
  return { activeTrivias, predictionEvents, settings }
}

export default async function HomePage() {
  const { activeTrivias, predictionEvents, settings } = await getLandingData()
  const totalParticipants = activeTrivias.reduce((s, t) => s + t._count.leads, 0)
  const totalPrizes = activeTrivias.reduce((s, t) => s + t.prizes.length, 0)

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

        {/* ── TRIVIA CARDS ────────────────────────────────────────────── */}
        <main id="trivias" className="max-w-6xl mx-auto px-4 py-10 sm:py-12 scroll-mt-20">
          {activeTrivias.length === 0 && predictionEvents.length === 0 ? (
            <div className="text-center py-20 sm:py-24 rounded-3xl bg-white/5 border border-white/10">
              <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-automotor-300" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Próximamente</h2>
              <p className="text-automotor-200 text-sm">Estamos preparando nuevos juegos con premios. ¡Volvé pronto!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-7 sm:mb-8">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-automotor-500 shadow-glow flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-expanded text-xl sm:text-2xl font-black text-white leading-none truncate">
                    Elegí tu juego
                  </h2>
                </div>
                <span className="flex-shrink-0 text-xs font-bold text-automotor-200 bg-white/10 border border-white/10 rounded-full px-2.5 py-1 tabular-nums">
                  {activeTrivias.length + predictionEvents.length} activo
                  {activeTrivias.length + predictionEvents.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* ── JUEGOS DE PREDICCIÓN ──────────────────────────────── */}
              {predictionEvents.length > 0 && (
                <div className="mb-6 sm:mb-8 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                  {predictionEvents.map(evento => (
                    <Link
                      key={evento.id}
                      href={`/predicciones/${evento.slug}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl shadow-xl shadow-automotor-950/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-automotor-300"
                      style={{
                        background: `linear-gradient(135deg, ${evento.primaryColor}, ${evento.secondaryColor})`,
                      }}
                    >
                      {/* El i20 N como ícono de marca Automotor, no como una
                          inscripción concreta del rally. CarLoop trae el loop
                          en video (372 KB) con `mix-blend-mode: screen`, que
                          mezcla directo contra el degradado oscuro de la card
                          -- sin envoltorio con fondo propio, ver CarLoop.tsx.
                          Con reduced-motion, ahorro de datos o conexión lenta
                          cae solo a este mismo sprite fijo. */}
                      <CarLoop className="pointer-events-none absolute -bottom-2 -right-4 w-52 sm:w-64 opacity-90 transition-transform duration-500 group-hover:translate-x-2 motion-reduce:transition-none" />

                      <div className="relative p-5 sm:p-6">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                            Predicciones
                          </span>
                          {evento.status === 'live' && (
                            <span className="rounded-full bg-brand-accent px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-automotor-950">
                              En vivo
                            </span>
                          )}
                        </div>

                        <h3 className="font-expanded text-xl sm:text-2xl font-black leading-tight text-white text-balance">
                          {evento.title}
                        </h3>
                        {evento.description && (
                          <p className="mt-1.5 max-w-[22rem] text-sm leading-relaxed text-white/80 line-clamp-2">
                            {evento.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center gap-4 text-xs font-bold text-white/70">
                          <span className="tabular-nums">{evento._count.markets} predicciones</span>
                          <span className="tabular-nums">{evento._count.contenders} equipos</span>
                        </div>

                        <span className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-6 text-sm font-black tracking-tight text-automotor-950 transition-transform group-hover:gap-2.5 motion-reduce:transition-none">
                          Jugar ahora <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {activeTrivias.map(trivia => {
                  const flyer = trivia.flyers[0]
                  const logo = mediaUrl(trivia.logoUrl ?? trivia.company?.logoUrl ?? trivia.brands[0]?.logoUrl)

                  return (
                    <Link
                      key={trivia.id}
                      href={`/play/${trivia.slug}`}
                      className="group flex flex-col bg-white rounded-2xl shadow-xl shadow-automotor-950/60 hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-automotor-300"
                    >
                      {/* Banner */}
                      {flyer ? (
                        <div className="relative h-44 overflow-hidden">
                          <Image src={mediaUrl(flyer.imageUrl)} alt={trivia.title} fill className="object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-500" unoptimized />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          {trivia.endDate && (
                            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" /> hasta {formatDateShort(trivia.endDate)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="h-40 relative flex items-center justify-center overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                        >
                          <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                          {logo ? (
                            <Image src={logo} alt={`Logo de ${trivia.title}`} width={140} height={56} className="h-14 w-auto object-contain relative z-10 drop-shadow-lg" unoptimized />
                          ) : (
                            <Trophy className="w-14 h-14 text-white/40 relative z-10" />
                          )}
                          {trivia.endDate && (
                            <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" /> hasta {formatDateShort(trivia.endDate)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-5 flex flex-col flex-1">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                          {trivia.company && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: trivia.primaryColor }}>
                              {trivia.company.name}
                            </span>
                          )}
                          {trivia.brands[0] && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {trivia.brands[0].name}
                            </span>
                          )}
                        </div>

                        <h3 className="font-black text-slate-900 text-lg mb-1 group-hover:text-automotor-700 transition-colors motion-reduce:transition-none leading-tight">
                          {trivia.title}
                        </h3>
                        {trivia.description && (
                          <p className="text-sm text-slate-500 mb-1 line-clamp-2 leading-relaxed">{stripMarkdown(trivia.description)}</p>
                        )}

                        {/* Premios: protagonistas, a la vista */}
                        {trivia.prizes.length > 0 && (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
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

                        {/* Meta + CTA */}
                        <div className="mt-auto pt-4">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" aria-hidden="true" />
                              <span className="tabular-nums">{trivia._count.leads} ya jugaron</span>
                            </span>
                            <span className="tabular-nums">{trivia._count.questions} preguntas</span>
                          </div>
                          <span
                            className="flex w-full min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-4 text-base font-black text-white shadow-lg transition-all duration-300 group-hover:brightness-110 group-hover:gap-3 motion-reduce:transition-none"
                            style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                          >
                            Jugar ahora <ChevronRight className="w-5 h-5" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </main>

        {/* ── RANKING ─────────────────────────────────────────────────── */}
        {activeTrivias.some(t => t.showLeaderboard !== false && t.leads.length > 0) && (
          <section className="max-w-6xl mx-auto px-4 pb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-automotor-500 shadow-glow flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <Medal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-expanded text-xl sm:text-2xl font-black text-white leading-none">Ranking de jugadores</h2>
                <p className="text-automotor-300 text-xs mt-1">Los mejores puestos se llevan los premios</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {activeTrivias.filter(t => t.showLeaderboard !== false && t.leads.length > 0).map(trivia => (
                <div key={trivia.id} className="bg-white rounded-2xl shadow-xl shadow-automotor-950/60 overflow-hidden">
                  {/* Card header */}
                  <div
                    className="px-5 py-3.5 flex items-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                  >
                    <Trophy className="w-4 h-4 text-white opacity-80 flex-shrink-0" aria-hidden="true" />
                    <h3 className="font-black text-white text-sm truncate">{trivia.title}</h3>
                    <span className="ml-auto text-white/70 text-xs flex-shrink-0 tabular-nums">{trivia._count.leads} jugadores</span>
                  </div>
                  {/* Entries */}
                  <div className="divide-y divide-slate-50">
                    {trivia.leads.map((lead, i) => {
                      const data = lead.formData as Record<string, string>
                      const rawName = data.nombre ?? data.name ?? 'Participante'
                      const rawLast = data.apellido ?? data.lastName ?? ''
                      const firstName = rawName.split(' ')[0]
                      const lastInitial = rawLast ? rawLast[0].toUpperCase() + '.' : ''
                      const displayName = lastInitial ? `${firstName} ${lastInitial}` : firstName
                      const pct = lead.maxScore > 0 ? Math.round((lead.score / lead.maxScore) * 100) : 0
                      return (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="w-7 text-center flex-shrink-0 text-lg leading-none">
                            {trivia.prizes.some(p => p.position === i + 1) && i < 3 ? (
                              MEDALS[i]
                            ) : (
                              <span className="text-xs font-bold text-slate-500 tabular-nums">{i + 1}</span>
                            )}
                          </span>
                          <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{displayName}</span>
                          <span className="font-black text-sm tabular-nums" style={{ color: trivia.primaryColor }}>
                            {lead.score.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 w-9 text-right tabular-nums">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="px-4 pb-3 pt-1">
                    <Link
                      href={`/play/${trivia.slug}`}
                      className="min-h-[44px] text-xs font-bold flex items-center justify-center gap-1 py-2 rounded-xl transition-all hover:opacity-80 motion-reduce:transition-none"
                      style={{ color: trivia.primaryColor, backgroundColor: `${trivia.primaryColor}10` }}
                    >
                      ¡Jugá y entrá al ranking! <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
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
