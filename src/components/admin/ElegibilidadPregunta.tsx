// Author: Angel Colman
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2, Search, Users } from 'lucide-react'

export interface ContenderElegible {
  id: string
  number: string | null
  name: string
  teamName: string | null
  category: string | null
  isActive: boolean
}

/** Otra pregunta de la que copiar la lista, para no rearmarla 21 veces. */
export interface PreguntaOrigen {
  id: string
  etiqueta: string
  contenderIds: string[] | null
}

const boton =
  'inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs ' +
  'font-bold text-slate-600 transition-colors hover:border-[#005CA8] hover:text-[#005CA8] ' +
  'disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600'

/**
 * Quién larga una pregunta.
 *
 * Sin lista declarada se pueden elegir todos los del juego. Eso no es lo mismo
 * que marcarlos uno por uno: una tripulación que se sume después entra sola en
 * la pregunta abierta, y no en la que los enumera. Por eso "Abrir a todos" es
 * un botón aparte y no marcar las 86 casillas.
 *
 * Los atajos son los que hacen que esto se pueda usar. Declarar a mano 57 de 86
 * tripulaciones, veintiuna veces, no es una interfaz. Con el buscador se marca
 * o desmarca en tanda lo que coincide ("histórico", "camioneta", el nombre de
 * un equipo), y con "Copiar de" se arma una pregunta y se replica en el resto.
 */
export function ElegibilidadPregunta({
  marketId, contenders, declarados, otras, onListo,
}: {
  marketId: string
  contenders: ContenderElegible[]
  /** Null = la pregunta está abierta a todos. */
  declarados: string[] | null
  otras: PreguntaOrigen[]
  onListo: () => void
}) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  // Null mientras siga abierta a todos; en cuanto se toca algo pasa a ser lista.
  const [seleccion, setSeleccion] = useState<string[] | null>(declarados)

  const elegibles = useMemo(() => contenders.filter(c => c.isActive), [contenders])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return elegibles
    return elegibles.filter(c =>
      [c.name, c.teamName, c.category, c.number]
        .filter(Boolean)
        .some(campo => campo!.toLowerCase().includes(q)),
    )
  }, [busqueda, elegibles])

  const marcados = useMemo(
    () => new Set(seleccion ?? elegibles.map(c => c.id)),
    [seleccion, elegibles],
  )

  // Una lista guardada puede nombrar a alguien que después se desactivó: ese
  // no se muestra, así que tampoco se cuenta.
  const marcadosVisibles = useMemo(
    () => elegibles.filter(c => marcados.has(c.id)).length,
    [elegibles, marcados],
  )

  /** Pasar de "abierta a todos" a lista arranca con todos marcados. */
  function conLista(fn: (actual: Set<string>) => Set<string>) {
    const base = new Set(seleccion ?? elegibles.map(c => c.id))
    setSeleccion(Array.from(fn(base)))
  }

  function alternar(id: string) {
    conLista(s => {
      const copia = new Set(s)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

  function marcarVisibles(valor: boolean) {
    conLista(s => {
      const copia = new Set(s)
      for (const c of visibles) {
        if (valor) copia.add(c.id)
        else copia.delete(c.id)
      }
      return copia
    })
  }

  function copiarDe(id: string) {
    const origen = otras.find(o => o.id === id)
    if (!origen) return
    setSeleccion(origen.contenderIds === null ? null : [...origen.contenderIds])
    toast.success(
      origen.contenderIds === null
        ? `Copiado de ${origen.etiqueta}: abierta a todos`
        : `Copiado de ${origen.etiqueta}: ${origen.contenderIds.length} tripulaciones`,
    )
  }

  async function guardar() {
    if (seleccion !== null && seleccion.length === 0) {
      toast.error('No se puede dejar una pregunta sin nadie para elegir.')
      return
    }

    setGuardando(true)
    const res = await fetch(`/api/admin/prediction-markets/${marketId}/eligibility`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenderIds: seleccion }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(false)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo guardar'); return }

    toast.success(
      cuerpo.declarados === null
        ? 'Pregunta abierta a todos los del juego'
        : `${cuerpo.declarados} tripulaciones largan esta pregunta`,
    )
    if (cuerpo.prediccionesFuera > 0) {
      toast.warning(
        `${cuerpo.prediccionesFuera} predicci${cuerpo.prediccionesFuera === 1 ? 'ón' : 'ones'} ` +
        'ya cargada quedó fuera de la lista. No se borró, pero no puede ganar.',
      )
    }
    onListo()
    router.refresh()
  }

  return (
    <div className="mt-2.5 rounded-xl bg-slate-50 p-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-xs font-bold text-slate-500">
          {seleccion === null
            ? `Abierta a todos los del juego (${elegibles.length})`
            : `${marcadosVisibles} de ${elegibles.length} largan esta pregunta`}
        </span>

        <button type="button" className={boton} onClick={() => setSeleccion(null)} disabled={seleccion === null}>
          Abrir a todos
        </button>

        {otras.length > 0 && (
          <select
            className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600"
            value=""
            onChange={e => { if (e.target.value) copiarDe(e.target.value) }}
            aria-label="Copiar la lista de otra pregunta"
          >
            <option value="">Copiar de…</option>
            {otras.map(o => (
              <option key={o.id} value={o.id}>
                {o.etiqueta} ({o.contenderIds === null ? 'todos' : o.contenderIds.length})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#005CA8] focus:outline-none"
            placeholder="Buscar por piloto, equipo, auto o categoría"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </span>
        <button type="button" className={boton} onClick={() => marcarVisibles(true)}>
          Marcar {busqueda ? `los ${visibles.length} que se ven` : 'todos'}
        </button>
        <button type="button" className={boton} onClick={() => marcarVisibles(false)}>
          Desmarcar {busqueda ? `los ${visibles.length} que se ven` : 'todos'}
        </button>
      </div>

      <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white">
        {visibles.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-slate-500">
            Ninguna tripulación coincide con “{busqueda}”.
          </li>
        )}
        {visibles.map(c => (
          <li key={c.id}>
            <label className="flex min-h-[40px] cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-slate-50">
              <input
                type="checkbox"
                className="h-4 w-4 flex-shrink-0 accent-[#005CA8]"
                checked={marcados.has(c.id)}
                onChange={() => alternar(c.id)}
              />
              <span className="w-10 flex-shrink-0 text-xs font-black tabular-nums text-slate-500">
                {c.number ? `#${c.number}` : '—'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">{c.name}</span>
                <span className="block truncate text-xs text-slate-400">
                  {[c.teamName, c.category].filter(Boolean).join(' · ') || '—'}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#005CA8] px-4 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-60"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Guardar
        </button>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          Al jugador solo se le ofrece a quien largue.
        </p>
      </div>
    </div>
  )
}
