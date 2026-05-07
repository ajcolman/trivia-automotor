// Author: Angel Colman
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { Trophy, Users, Clock, ChevronRight, Zap, Star } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export const revalidate = 60

async function getLandingData() {
  const now = new Date()

  const [companies, activeTrivias] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      include: { brands: { where: { isActive: true }, include: { trivias: { where: { isActive: true, isPublic: true } } } } },
    }),
    prisma.trivia.findMany({
      where: {
        isActive: true,
        isPublic: true,
        AND: [
          { OR: [{ endDate: null }, { endDate: { gt: now } }] },
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { name: true, logoUrl: true } },
        brand: { select: { name: true, logoUrl: true } },
        prizes: { orderBy: { position: 'asc' }, take: 3 },
        flyers: { where: { isActive: true }, take: 1 },
        _count: { select: { leads: true } },
      },
    }),
  ])

  return { companies, activeTrivias }
}

export default async function HomePage() {
  const { activeTrivias } = await getLandingData()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Hero */}
      <header style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0856c8 100%)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-300" />
            <span className="text-white font-black text-xl tracking-tight">Automotor Trivia</span>
          </div>
          <Link
            href="/admin/login"
            className="text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            Panel Admin →
          </Link>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 text-sm mb-6">
            <Star className="w-4 h-4 text-yellow-300" />
            <span>Grupo Automotor Paraguay</span>
          </div>
          <h1 className="text-5xl font-black mb-4 tracking-tight">
            Trivias y Promociones
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto">
            Participa en nuestras trivias interactivas, gana premios y demuestra tu conocimiento.
          </p>
          <div className="flex justify-center gap-6 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{activeTrivias.reduce((s, t) => s + t._count.leads, 0).toLocaleString()} participantes</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{activeTrivias.length} trivias activas</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {activeTrivias.length === 0 ? (
          <div className="text-center py-24">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-bold text-gray-400 mb-2">Próximamente</h2>
            <p className="text-gray-400">No hay trivias activas en este momento. ¡Vuelve pronto!</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-gray-800 mb-8">
              Trivias Disponibles
              <span className="ml-3 inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold" style={{ backgroundColor: '#0d6efd' }}>
                {activeTrivias.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTrivias.map(trivia => {
                const flyer = trivia.flyers[0]
                const logo = trivia.company?.logoUrl ?? trivia.brand?.logoUrl

                return (
                  <Link
                    key={trivia.id}
                    href={`/play/${trivia.slug}`}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1"
                  >
                    {/* Flyer or color banner */}
                    {flyer ? (
                      <div className="relative h-44 overflow-hidden">
                        <Image
                          src={flyer.imageUrl}
                          alt={trivia.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                    ) : (
                      <div
                        className="h-32 relative flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${trivia.primaryColor}, ${trivia.secondaryColor})` }}
                      >
                        {logo ? (
                          <Image src={logo} alt="Logo" width={120} height={48} className="h-12 w-auto object-contain" unoptimized />
                        ) : (
                          <Trophy className="w-12 h-12 text-white/60" />
                        )}
                      </div>
                    )}

                    <div className="p-5">
                      {/* Company + Brand */}
                      <div className="flex items-center gap-2 mb-2">
                        {trivia.company && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#0d6efd' }}>
                            {trivia.company.name}
                          </span>
                        )}
                        {trivia.brand && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {trivia.brand.name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                        {trivia.title}
                      </h3>
                      {trivia.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{trivia.description}</p>
                      )}

                      {/* Prizes preview */}
                      {trivia.prizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {trivia.prizes.slice(0, 2).map(p => (
                            <span key={p.id} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
                              {p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : '🥉'} {p.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {trivia._count.leads}
                          </span>
                          {trivia.endDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              hasta {formatDateShort(trivia.endDate)}
                            </span>
                          )}
                        </div>
                        <span className="text-blue-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
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

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Automotor S.A. / Carmotor S.A. · Todos los derechos reservados</p>
          <p className="mt-1">Desarrollado por <strong>Angel Colman</strong></p>
        </div>
      </footer>
    </div>
  )
}
