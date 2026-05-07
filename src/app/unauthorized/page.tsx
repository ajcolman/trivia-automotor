// Author: Angel Colman
import Link from 'next/link'
import Image from 'next/image'
import { Lock, ArrowLeft } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-800">
          <Image 
            src="/images/403-restricted.png" 
            alt="Ruta Cerrada" 
            fill 
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-red-600 p-4 rounded-full shadow-2xl animate-pulse">
              <Lock className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="absolute bottom-6 left-0 right-0">
            <span className="text-5xl font-black text-white drop-shadow-lg">403</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight">
            ¡Ruta Cerrada!
          </h1>
          <p className="text-slate-400 leading-relaxed">
            No tienes los permisos necesarios para entrar en este tramo. Esta zona es exclusiva para personal autorizado.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/">
            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Retroceder
            </button>
          </Link>
        </div>
        
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
          Acceso Restringido - Tramo Cronometrado
        </p>
      </div>
    </div>
  )
}
