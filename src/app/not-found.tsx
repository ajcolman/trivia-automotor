// Author: Angel Colman
import Link from 'next/link'
import Image from 'next/image'
import { Home, Map } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
          <Image 
            src="/images/404-rally.png" 
            alt="Perdido en la ruta" 
            fill 
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-0 right-0">
            <span className="text-6xl font-black text-white drop-shadow-lg">404</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            ¡Te saliste de la ruta!
          </h1>
          <p className="text-slate-500 leading-relaxed">
            Parece que el GPS nos falló. Esta página no existe o fue movida a otro tramo.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/">
            <button className="w-full bg-[#003087] hover:bg-[#002060] text-white font-bold py-3 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Home className="w-4 h-4" /> Volver al Inicio
            </button>
          </Link>
          <Link href="/admin/login">
            <button className="w-full bg-white hover:bg-slate-50 text-slate-600 font-semibold py-3 rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-2">
              <Map className="w-4 h-4" /> Ver Mapa de Control
            </button>
          </Link>
        </div>
        
        <p className="text-xs text-slate-400 italic">
          Rally Team Automotor - Servicio de Asistencia
        </p>
      </div>
    </div>
  )
}
