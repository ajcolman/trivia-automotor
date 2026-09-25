// Author: Angel Colman
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { Users, Plus, Trash2, Loader2, Upload, Star, Eye, EyeOff } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export interface ParticipanteFila {
  id: string
  number: string | null
  name: string
  subtitle: string | null
  teamName: string | null
  category: string | null
  isFeatured: boolean
  isActive: boolean
}

/** Cómo se llama cada columna de la planilla, con los sinónimos que se usan. */
const COLUMNAS: { campo: keyof FilaImportada; alias: string[] }[] = [
  { campo: 'number', alias: ['numero', 'número', 'nro', 'n', 'number', 'dorsal'] },
  { campo: 'name', alias: ['nombre', 'piloto', 'name', 'driver'] },
  { campo: 'subtitle', alias: ['copiloto', 'subtitulo', 'subtítulo', 'codriver', 'co-driver'] },
  { campo: 'teamName', alias: ['equipo', 'team', 'escuderia', 'escudería'] },
  { campo: 'category', alias: ['categoria', 'categoría', 'clase', 'category', 'auto', 'car'] },
  { campo: 'isFeatured', alias: ['destacado', 'featured'] },
]

interface FilaImportada {
  number?: string
  name?: string
  subtitle?: string
  teamName?: string
  category?: string
  isFeatured?: boolean
}

const campo =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-[#005CA8] focus:outline-none'

const NUEVO_VACIO = {
  number: '', name: '', subtitle: '', teamName: '', category: '', isFeatured: false,
}

/** Normaliza el encabezado de la planilla al campo que le corresponde. */
function aCampo(encabezado: string): keyof FilaImportada | null {
  const limpio = encabezado.trim().toLowerCase()
  return COLUMNAS.find(c => c.alias.includes(limpio))?.campo ?? null
}

function esVerdadero(v: string): boolean {
  return ['si', 'sí', 'x', '1', 'true', 'verdadero'].includes(v.trim().toLowerCase())
}

export function EventoParticipantes({
  eventoId, participantes,
}: { eventoId: string; participantes: ParticipanteFila[] }) {
  const router = useRouter()
  const archivo = useRef<HTMLInputElement>(null)
  const [guardando, setGuardando] = useState(false)
  const [tocando, setTocando] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [aBorrar, setABorrar] = useState<ParticipanteFila | null>(null)
  const [nuevo, setNuevo] = useState(NUEVO_VACIO)

  async function agregar() {
    if (!nuevo.name.trim()) { toast.error('Poné el nombre del participante.'); return }
    setGuardando(true)
    const res = await fetch(`/api/admin/prediction-events/${eventoId}/contenders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: nuevo.number.trim() || null,
        name: nuevo.name.trim(),
        subtitle: nuevo.subtitle.trim() || null,
        teamName: nuevo.teamName.trim() || null,
        category: nuevo.category.trim() || null,
        isFeatured: nuevo.isFeatured,
      }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    setGuardando(false)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo agregar'); return }
    toast.success(cuerpo.actualizados > 0 ? 'Participante actualizado' : 'Participante agregado')
    setNuevo(NUEVO_VACIO)
    router.refresh()
  }

  function importar(file: File) {
    setImportando(true)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data, meta }) => {
        const mapa = new Map<string, keyof FilaImportada>()
        for (const h of meta.fields ?? []) {
          const c = aCampo(h)
          if (c) mapa.set(h, c)
        }
        if (!Array.from(mapa.values()).includes('name')) {
          setImportando(false)
          toast.error('La planilla necesita una columna "nombre" (o "piloto").')
          return
        }

        const filas: FilaImportada[] = []
        for (const cruda of data) {
          const fila: FilaImportada = {}
          for (const [h, c] of Array.from(mapa)) {
            const valor = (cruda[h] ?? '').trim()
            if (!valor) continue
            if (c === 'isFeatured') fila.isFeatured = esVerdadero(valor)
            else fila[c] = valor
          }
          if (fila.name) filas.push(fila)
        }

        if (filas.length === 0) {
          setImportando(false)
          toast.error('No se encontró ninguna fila con nombre.')
          return
        }

        const res = await fetch(`/api/admin/prediction-events/${eventoId}/contenders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantes: filas }),
        })
        const cuerpo = await res.json().catch(() => ({}))
        setImportando(false)

        if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo importar'); return }
        toast.success(`${cuerpo.creados} nuevos, ${cuerpo.actualizados} actualizados`)
        router.refresh()
      },
      error: () => { setImportando(false); toast.error('No se pudo leer el archivo.') },
    })
  }

  async function alternar(p: ParticipanteFila, datos: Partial<ParticipanteFila>) {
    setTocando(p.id)
    const res = await fetch(`/api/admin/prediction-contenders/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
    setTocando(null)
    if (res.ok) router.refresh()
    else toast.error((await res.json().catch(() => ({})))?.error ?? 'No se pudo guardar')
  }

  async function borrar(p: ParticipanteFila) {
    setABorrar(null)
    setTocando(p.id)
    const res = await fetch(`/api/admin/prediction-contenders/${p.id}`, { method: 'DELETE' })
    const cuerpo = await res.json().catch(() => ({}))
    setTocando(null)

    if (!res.ok) { toast.error(cuerpo?.error ?? 'No se pudo borrar'); return }
    toast.success(
      cuerpo.desactivado
        ? `${p.name} quedó oculto: ya lo habían elegido en ${cuerpo.elegidoEn} predicciones.`
        : `${p.name} borrado`,
    )
    router.refresh()
  }

  const activos = participantes.filter(p => p.isActive).length

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
        <Users className="h-4 w-4" /> Participantes
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Es la lista entre la que elige el jugador. Los destacados salen primero.
        {participantes.length > activos && (
          <span className="font-semibold text-slate-600">
            {' '}· {participantes.length - activos} oculto{participantes.length - activos !== 1 ? 's' : ''}
          </span>
        )}
      </p>

      {participantes.length === 0 ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sin participantes no hay nada que elegir: las preguntas van a aparecer vacías.
          Cargalos a mano o importá la planilla del entry list.
        </p>
      ) : (
        <ul className="mb-4 max-h-96 divide-y divide-slate-100 overflow-y-auto">
          {participantes.map(p => (
            <li
              key={p.id}
              className={`flex items-center gap-3 py-2.5 ${p.isActive ? '' : 'opacity-55'}`}
            >
              <span className="w-10 flex-shrink-0 text-center text-sm font-black tabular-nums text-[#005CA8]">
                {p.number ?? '—'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {p.name}
                  {p.subtitle && <span className="font-normal text-slate-500"> · {p.subtitle}</span>}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {[p.teamName, p.category].filter(Boolean).join(' · ') || '—'}
                </span>
              </span>

              <button
                type="button"
                onClick={() => alternar(p, { isFeatured: !p.isFeatured })}
                disabled={tocando === p.id}
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-60
                  ${p.isFeatured
                    ? 'border-amber-300 text-amber-500'
                    : 'border-slate-200 text-slate-300 hover:border-amber-300 hover:text-amber-500'}`}
                aria-label={p.isFeatured ? `Quitar destaque a ${p.name}` : `Destacar a ${p.name}`}
                title={p.isFeatured ? 'Destacado' : 'Destacar'}
              >
                <Star className="h-4 w-4" fill={p.isFeatured ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                onClick={() => alternar(p, { isActive: !p.isActive })}
                disabled={tocando === p.id}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-[#005CA8] hover:text-[#005CA8] disabled:opacity-60"
                aria-label={p.isActive ? `Ocultar a ${p.name}` : `Mostrar a ${p.name}`}
                title={p.isActive ? 'Ocultar del juego' : 'Volver a mostrar'}
              >
                {p.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => setABorrar(p)}
                disabled={tocando === p.id}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                aria-label={`Borrar a ${p.name}`}
              >
                {tocando === p.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-slate-200 p-3">
        <p className="mb-2.5 text-xs font-black uppercase tracking-wider text-slate-400">
          Agregar participante
        </p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[90px_1fr_1fr_1fr_1fr]">
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Número</span>
            <input
              type="text" className={campo} placeholder="11" value={nuevo.number}
              onChange={e => setNuevo(n => ({ ...n, number: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Nombre</span>
            <input
              type="text" className={campo} placeholder="Thierry Neuville" value={nuevo.name}
              onChange={e => setNuevo(n => ({ ...n, name: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Acompañante</span>
            <input
              type="text" className={campo} placeholder="Martijn Wydaeghe" value={nuevo.subtitle}
              onChange={e => setNuevo(n => ({ ...n, subtitle: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Equipo</span>
            <input
              type="text" className={campo} placeholder="Hyundai Shell Mobis" value={nuevo.teamName}
              onChange={e => setNuevo(n => ({ ...n, teamName: e.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Categoría</span>
            <input
              type="text" className={campo} placeholder="Rally1 · i20 N" value={nuevo.category}
              onChange={e => setNuevo(n => ({ ...n, category: e.target.value }))}
            />
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox" checked={nuevo.isFeatured}
            onChange={e => setNuevo(n => ({ ...n, isFeatured: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 accent-[#005CA8]"
          />
          Destacar (aparece primero en la lista del jugador)
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={agregar}
            disabled={guardando}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#005CA8] px-5 text-sm font-bold text-white transition-colors hover:bg-[#004E8F] disabled:opacity-60"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </button>

          <button
            type="button"
            onClick={() => archivo.current?.click()}
            disabled={importando}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-[#005CA8] hover:text-[#005CA8] disabled:opacity-60"
          >
            {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar planilla
          </button>
          <input
            ref={archivo}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              // Se limpia para poder reimportar el mismo archivo corregido.
              e.target.value = ''
              if (f) importar(f)
            }}
          />
          <span className="text-xs text-slate-400">
            CSV con columnas: numero, nombre, copiloto, equipo, categoria, destacado.
            Reimportar actualiza a los que ya están, por número.
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={aBorrar != null}
        title={`¿Borrar a ${aBorrar?.name}?`}
        description="Si alguien ya lo eligió en una predicción no se borra: queda oculto para que los puntos ya repartidos sigan teniendo sentido."
        confirmLabel="Borrar"
        destructive
        onConfirm={() => aBorrar && borrar(aBorrar)}
        onCancel={() => setABorrar(null)}
      />
    </section>
  )
}
