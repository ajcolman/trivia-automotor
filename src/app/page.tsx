// Author: Angel Colman
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { Trophy, Users, Zap, ChevronRight, Clock, Star, Award, Medal } from 'lucide-react'
import { formatDateShort, getNowAsuncion } from '@/lib/utils'

export const revalidate = 60

const MEDALS = ['🥇', '🥈', '🥉']

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
      prizes: { orderBy: { position: 'asc' }, take: 3 },
      flyers: { where: { isActive: true }, take: 1 },
      _count: { select: { leads: true, questions: true } },
      leads: {
        orderBy: [{ score: 'desc' }, { completedAt: 'asc' }],
        take: 5,
        select: { formData: true, score: true, maxScore: true },
      },
    },
  })
  return { activeTrivias }
}

export default async function HomePage() {
  const { activeTrivias } = await getLandingData()
  const totalParticipants = activeTrivias.reduce((s, t) => s + t._count.leads, 0)

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Image
            src="/uploads/logoa.png"
            alt="Automotor"
            width={160}
            height={52}
            className="h-9 w-auto object-contain"
            unoptimized
          />
          <Link
            href="/admin/login"
            className="text-sm font-semibold text-slate-500 hover:text-[#003087] transition-colors flex items-center gap-1"
          >
            Panel Admin <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <div className="flex-grow">
        {/* ── HERO ────────────────────────────────────────────────────── */}
        <header className="relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, #001a4d 0%, #003087 40%, #0052cc 70%, #0d6efd 100%)'
          }} />
          {/* Decorative circles */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #FFD700, transparent)' }} />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />
          {/* Premium Mesh Pattern */}
          <div className="absolute inset-0 opacity-[0.08]" 
            style={{ 
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }} 
          />
          <div className="absolute inset-0 opacity-[0.03]" 
            style={{ 
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '8px 8px'
            }} 
          />
          
          {/* Animated Glow / Scanline */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-white/5 to-transparent -top-40 animate-[scanline_8s_linear_infinite]" />
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scanline {
              0% { transform: translateY(0); }
              100% { transform: translateY(100vh); }
            }
          `}} />

          <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">


            <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
              Trivias &amp; <span style={{ color: '#FFD700' }}>Premios</span>
            </h1>
            <p className="text-lg text-white/70 mb-10 max-w-md mx-auto">
              Participá en nuestras trivias interactivas, demostrá tu conocimiento y ganá increíbles premios.
            </p>

            {/* Stats pills */}
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: <Users className="w-4 h-4" />, value: `${totalParticipants.toLocaleString()}`, label: 'participantes' },
                { icon: <Zap className="w-4 h-4" />, value: `${activeTrivias.length}`, label: 'trivias activas' },
                { icon: <Award className="w-4 h-4" />, value: `${activeTrivias.reduce((s, t) => s + t.prizes.length, 0)}`, label: 'premios en juego' },
              ].map((s, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-white backdrop-blur-md shadow-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 group"
                >
                  <span className="text-yellow-400 group-hover:scale-110 transition-transform">{s.icon}</span>
                  <span className="font-black text-lg tracking-tight">{s.value}</span>
                  <span className="text-white/50 text-xs font-bold uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wave */}
          <div className="relative h-12 overflow-hidden">
            <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full">
              <path d="M0 48L480 16L960 40L1440 8V48H0Z" fill="#f0f4ff" />
            </svg>
          </div>
        </header>

        {/* ── TRIVIA CARDS ────────────────────────────────────────────── */}
        <main className="max-w-6xl mx-auto px-4 py-12">
          {activeTrivias.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-500 mb-2">Próximamente</h2>
              <p className="text-slate-400 text-sm">No hay trivias activas en este momento. ¡Volvé pronto!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-800">
                  Trivias disponibles
                </h2>
                <span className="text-sm text-slate-400">{activeTrivias.length} activa{activeTrivias.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTrivias.map(trivia => {
                  const flyer = trivia.flyers[0]
                  const logo = trivia.logoUrl ?? trivia.company?.logoUrl ?? trivia.brands[0]?.logoUrl
                  const pct = Math.min(100, Math.round((trivia._count.leads / 100) * 100))

                  return (
                    <Link
                      key={trivia.id}
                      href={`/play/${trivia.slug}`}
                      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-white hover:-translate-y-1.5 block"
                    >
                      {/* Banner */}
                      {flyer ? (
                        <div className="relative h-44 overflow-hidden">
                          <Image src={flyer.imageUrl} alt={trivia.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          {trivia.endDate && (
                            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> hasta {formatDateShort(trivia.endDate)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="h-36 relative flex items-center justify-center overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                        >
                          <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                          {logo ? (
                            <Image src={logo} alt="Logo" width={140} height={56} className="h-14 w-auto object-contain relative z-10 drop-shadow-lg" unoptimized />
                          ) : (
                            <Trophy className="w-14 h-14 text-white/40 relative z-10" />
                          )}
                          {trivia.endDate && (
                            <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> hasta {formatDateShort(trivia.endDate)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-5">
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
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {trivia._count.questions} preguntas
                          </span>
                        </div>

                        <h3 className="font-black text-slate-900 text-lg mb-1 group-hover:text-[#003087] transition-colors leading-tight">
                          {trivia.title}
                        </h3>
                        {trivia.description && (
                          <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">{trivia.description}</p>
                        )}

                        {/* Prizes */}
                        {trivia.prizes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {trivia.prizes.slice(0, 3).map(p => (
                              <span key={p.id} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
                                {p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : '🥉'} {p.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Users className="w-3.5 h-3.5" />
                            <span>{trivia._count.leads} participante{trivia._count.leads !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#003087] group-hover:gap-2.5 transition-all">
                            Jugar <ChevronRight className="w-4 h-4" />
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

        {/* ── LEADERBOARD ─────────────────────────────────────────────── */}
        {activeTrivias.some(t => t.leads.length > 0) && (
          <section className="max-w-6xl mx-auto px-4 pb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#003087' }}>
                <Medal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 leading-none">Tabla de Posiciones</h2>
                <p className="text-slate-400 text-xs mt-0.5">Top jugadores por trivia</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTrivias.filter(t => t.leads.length > 0).map(trivia => (
                <div key={trivia.id} className="bg-white rounded-2xl shadow-md overflow-hidden border border-white">
                  {/* Card header */}
                  <div
                    className="px-5 py-3.5 flex items-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                  >
                    <Trophy className="w-4 h-4 text-white opacity-80 flex-shrink-0" />
                    <h3 className="font-black text-white text-sm truncate">{trivia.title}</h3>
                    <span className="ml-auto text-white/60 text-xs flex-shrink-0">{trivia._count.leads} jugadores</span>
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
                              <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                            )}
                          </span>
                          <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{displayName}</span>
                          <span className="font-black text-sm tabular-nums" style={{ color: trivia.primaryColor }}>
                            {lead.score.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 w-9 text-right tabular-nums">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="px-4 pb-3 pt-1">
                    <Link
                      href={`/play/${trivia.slug}`}
                      className="text-xs font-bold flex items-center justify-center gap-1 py-2 rounded-xl transition-all hover:opacity-80"
                      style={{ color: trivia.primaryColor, backgroundColor: `${trivia.primaryColor}10` }}
                    >
                      ¡Jugá y entrá al ranking! <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/uploads/logoa.png" alt="Automotor" width={120} height={40} className="h-8 w-auto object-contain opacity-60" unoptimized />
          <p className="text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} Automotor S.A. / Carmotor S.A. · Desarrollado por{' '}
            <strong className="text-slate-500">Business Intelligence & Analytics - Marketing Digital</strong>
          </p>
        </div>
      </footer>
    </div>
  )
}
