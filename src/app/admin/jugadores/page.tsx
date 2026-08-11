// Author: Angel Colman
'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Users, Search, Trash2, Loader2, MailCheck, MailX } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Jugador {
  id: string
  fullName: string
  email: string
  phone: string
  cedula: string | null
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  _count: { predictions: number }
}

const fFecha = new Intl.DateTimeFormat('es-PY', {
  timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric',
})

export default function JugadoresPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [aBorrar, setABorrar] = useState<Jugador | null>(null)
  const [borrando, setBorrando] = useState(false)

  const cargar = useCallback(async (q: string) => {
    setCargando(true)
    try {
      const res = await fetch(`/api/admin/players?q=${encodeURIComponent(q)}`)
      if (res.ok) setJugadores(await res.json())
      else toast.error('No se pudo cargar la lista')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  async function borrar() {
    if (!aBorrar) return
    setBorrando(true)
    const res = await fetch(`/api/admin/players/${aBorrar.id}`, { method: 'DELETE' })
    const cuerpo = await res.json().catch(() => ({}))
    setBorrando(false)
    setABorrar(null)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo borrar'); return }
    toast.success(
      cuerpo.borradas > 0
        ? `Cuenta eliminada junto con ${cuerpo.borradas} predicciones.`
        : 'Cuenta eliminada.',
    )
    cargar(busqueda)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#005CA8]">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Jugadores</h1>
          <p className="text-sm text-slate-500">
            Cuentas de clientes. Eliminar una cumple el pedido de baja que promete la política de privacidad.
          </p>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo, cédula o teléfono"
          aria-label="Buscar jugador"
          className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm text-slate-900 focus:border-[#005CA8] focus:outline-none"
        />
      </div>

      {cargando ? (
        <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : jugadores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="font-semibold text-slate-500">
            {busqueda ? 'Ningún jugador coincide con la búsqueda.' : 'Todavía no hay jugadores registrados.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="p-3 font-bold">Jugador</th>
                <th className="p-3 font-bold">Contacto</th>
                <th className="p-3 font-bold">Cédula</th>
                <th className="p-3 font-bold">Predicciones</th>
                <th className="p-3 font-bold">Alta</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jugadores.map(j => (
                <tr key={j.id}>
                  <td className="p-3">
                    <span className="block font-bold text-slate-900">{j.fullName}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      {j.emailVerifiedAt
                        ? <><MailCheck className="h-3 w-3 text-green-600" aria-hidden="true" /> verificado</>
                        : <><MailX className="h-3 w-3 text-amber-600" aria-hidden="true" /> sin verificar</>}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="block text-slate-700">{j.email}</span>
                    <span className="block text-xs text-slate-500 tabular-nums">{j.phone}</span>
                  </td>
                  <td className="p-3 tabular-nums text-slate-700">{j.cedula ?? '—'}</td>
                  <td className="p-3 tabular-nums text-slate-700">{j._count.predictions}</td>
                  <td className="p-3 tabular-nums text-slate-500">{fFecha.format(new Date(j.createdAt))}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setABorrar(j)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:text-red-600"
                      aria-label={`Eliminar la cuenta de ${j.fullName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={aBorrar !== null}
        title="Eliminar la cuenta"
        description={
          aBorrar
            ? `Se borra la cuenta de ${aBorrar.fullName} (${aBorrar.email})` +
              (aBorrar._count.predictions > 0
                ? ` junto con sus ${aBorrar._count.predictions} predicciones, y desaparece de los rankings.`
                : '.') +
              ' No se puede deshacer.'
            : ''
        }
        confirmLabel={borrando ? 'Eliminando…' : 'Eliminar'}
        destructive
        onConfirm={borrar}
        onCancel={() => setABorrar(null)}
      />
    </div>
  )
}
