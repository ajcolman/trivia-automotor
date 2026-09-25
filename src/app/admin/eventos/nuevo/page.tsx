// Author: Angel Colman
import Link from 'next/link'
import { ChevronLeft, Flag } from 'lucide-react'
import { EventoNuevo } from '@/components/admin/EventoNuevo'

export default function NuevoEventoPage() {
  return (
    <div className="p-6">
      <Link
        href="/admin/eventos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#005CA8]"
      >
        <ChevronLeft className="h-4 w-4" /> Juegos de predicción
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#005CA8]">
          <Flag className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Nuevo juego de predicción</h1>
          <p className="text-sm text-slate-500">
            Crealo con lo básico y después cargale tramos, participantes y preguntas.
          </p>
        </div>
      </div>

      <EventoNuevo />
    </div>
  )
}
