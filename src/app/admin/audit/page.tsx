// Author: Angel Colman
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border-0',
  UPDATE: 'bg-blue-100 text-blue-700 border-0',
  DELETE: 'bg-red-100 text-red-700 border-0',
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Edición',
  DELETE: 'Eliminación',
}

const ENTITY_LABELS: Record<string, string> = {
  Trivia: 'Trivia',
  Company: 'Empresa',
  Brand: 'Marca',
  User: 'Usuario',
  Tournament: 'Torneo',
  PlatformSettings: 'Config. Plataforma',
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { entityType?: string; action?: string; page?: string }
}) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role: string })?.role
  if (role !== 'super_admin') redirect('/admin/dashboard')

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const pageSize = 50
  const entityType = searchParams.entityType ?? undefined
  const action = searchParams.action ?? undefined

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(action ? { action: action as 'CREATE' | 'UPDATE' | 'DELETE' } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  const filterLink = (key: string, value: string) => {
    const p = new URLSearchParams({ ...searchParams, [key]: value, page: '1' })
    return `/admin/audit?${p}`
  }

  const clearFilter = (key: string) => {
    const p = new URLSearchParams(searchParams as Record<string, string>)
    p.delete(key)
    p.set('page', '1')
    return `/admin/audit?${p}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-slate-600" />
        <h1 className="text-2xl font-black text-slate-800">Auditoría</h1>
        <span className="text-sm text-slate-400 font-normal">{total} registros</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center mr-1">Entidad:</span>
        {['Trivia', 'Company', 'Brand', 'User', 'Tournament', 'PlatformSettings'].map(e => (
          <a key={e} href={entityType === e ? clearFilter('entityType') : filterLink('entityType', e)}>
            <Badge
              className={
                entityType === e
                  ? 'bg-slate-700 text-white border-0 cursor-pointer'
                  : 'bg-slate-100 text-slate-600 border-0 cursor-pointer hover:bg-slate-200'
              }
            >
              {ENTITY_LABELS[e] ?? e}
            </Badge>
          </a>
        ))}
        <span className="text-xs text-slate-500 self-center ml-3 mr-1">Acción:</span>
        {['CREATE', 'UPDATE', 'DELETE'].map(a => (
          <a key={a} href={action === a ? clearFilter('action') : filterLink('action', a)}>
            <Badge
              className={
                action === a
                  ? 'bg-slate-700 text-white border-0 cursor-pointer'
                  : `${ACTION_STYLES[a]} cursor-pointer hover:opacity-80`
              }
            >
              {ACTION_LABELS[a]}
            </Badge>
          </a>
        ))}
      </div>

      {logs.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <p className="text-slate-400">No hay registros de auditoría aún.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entidad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge className={ACTION_STYLES[log.action] ?? 'bg-slate-100 text-slate-600 border-0'}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ENTITY_LABELS[log.entityType] ?? log.entityType}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-xs truncate">{log.entityName ?? log.entityId}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{log.userName}</span>
                      <span className="text-slate-400 text-xs ml-1">({log.userEmail})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          {page > 1 && (
            <a
              href={`/admin/audit?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
              className="px-3 py-1.5 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
            >
              ← Anterior
            </a>
          )}
          <span className="text-sm text-slate-500">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/audit?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
              className="px-3 py-1.5 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
            >
              Siguiente →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
