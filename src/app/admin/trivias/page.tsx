// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Eye, Pencil, BarChart3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateShort } from '@/lib/utils'
import { TriviaToggle } from '@/components/admin/TriviaToggle'

export default async function TriviasPage() {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as { id: string }).id
  const role = (session!.user as { role: string }).role
  const isSuperAdmin = role === 'super_admin'

  const trivias = await prisma.trivia.findMany({
    where: isSuperAdmin ? {} : { createdBy: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { name: true } },
      brands: { select: { name: true }, take: 1 },
      creator: { select: { name: true } },
      _count: { select: { leads: true, questions: true } },
    },
  })

  const now = new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">Trivias</h1>
        <Link href="/admin/trivias/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Trivia
          </Button>
        </Link>
      </div>

      {trivias.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <p className="text-slate-400 mb-4">No hay trivias creadas aún.</p>
            <Link href="/admin/trivias/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Crear primera trivia
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {trivias.map(trivia => {
            const isExpired = trivia.endDate && now > trivia.endDate
            const isNotStarted = trivia.startDate && now < trivia.startDate

            let statusBadge = <Badge className="bg-green-100 text-green-700 border-0">Activa</Badge>
            if (!trivia.isActive) statusBadge = <Badge variant="secondary">Inactiva</Badge>
            else if (isExpired) statusBadge = <Badge className="bg-red-100 text-red-700 border-0">Expirada</Badge>
            else if (isNotStarted) statusBadge = <Badge className="bg-yellow-100 text-yellow-700 border-0">Programada</Badge>

            return (
              <Card key={trivia.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Color indicator */}
                    <div
                      className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-lg"
                      style={{ backgroundColor: trivia.primaryColor }}
                    >
                      {trivia.title[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800">{trivia.title}</h3>
                            {statusBadge}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            /{trivia.slug}
                            {trivia.company && ` · ${trivia.company.name}`}
                            {trivia.brands[0] && ` / ${trivia.brands[0].name}`}
                          </p>
                        </div>
                        <TriviaToggle id={trivia.id} isActive={trivia.isActive} />
                      </div>

                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                        <span>{trivia._count.questions} preguntas</span>
                        <span>{trivia._count.leads} contactos</span>
                        {trivia.startDate && <span>Desde: {formatDateShort(trivia.startDate)}</span>}
                        {trivia.endDate && <span>Hasta: {formatDateShort(trivia.endDate)}</span>}
                        <span>Máx. participaciones: {trivia.maxPlaysPerUser}</span>
                        {isSuperAdmin && <span>Creada por: {trivia.creator.name}</span>}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={`/play/${trivia.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/trivias/${trivia.id}/leads`}>
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-green-600">
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/trivias/${trivia.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
