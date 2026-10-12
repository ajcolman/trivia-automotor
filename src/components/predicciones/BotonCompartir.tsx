// Author: Angel Colman
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Share2, Check, Copy, MessageCircle } from 'lucide-react'

/**
 * Compartir un juego.
 *
 * En el celular usa el menú de compartir del sistema, que es donde está
 * WhatsApp junto con todo lo demás. En la computadora ese menú no existe en
 * casi ningún navegador, así que se ofrecen las dos acciones que sirven:
 * copiar el enlace y abrir WhatsApp Web.
 */
export function BotonCompartir({
  slug, titulo, variante = 'claro',
}: {
  slug: string
  titulo: string
  /** `claro` para fondos oscuros; `panel` para el admin. */
  variante?: 'claro' | 'panel'
}) {
  const [copiado, setCopiado] = useState(false)

  // Se arma en el cliente: es la única forma de acertarle al dominio desde el
  // que el usuario está mirando, sin depender de una variable de entorno.
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/predicciones/${slug}`
  const texto = `${titulo} — cargá tus predicciones en Automotor Play`

  async function compartir() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url })
        return
      } catch {
        // Si lo cancela, no hay nada que avisar.
        return
      }
    }
    copiar()
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      toast.success('Enlace copiado')
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('No se pudo copiar. Copiá el enlace de la barra de direcciones.')
    }
  }

  const base =
    'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-colors'
  const estilo =
    variante === 'panel'
      ? 'border border-slate-200 text-slate-600 hover:border-[#005CA8] hover:text-[#005CA8]'
      : 'bg-white/95 text-slate-800 shadow-sm ring-1 ring-black/5 hover:bg-white'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* El menú del sistema solo existe en celular; ahí es un botón solo. */}
      <button type="button" onClick={compartir} className={`${base} ${estilo} sm:hidden`}>
        <Share2 className="h-4 w-4" aria-hidden="true" /> Compartir
      </button>

      <button type="button" onClick={copiar} className={`${base} ${estilo} hidden sm:inline-flex`}>
        {copiado ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copiado ? 'Copiado' : 'Copiar enlace'}
      </button>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`}
        target="_blank"
        rel="noreferrer"
        className={`${base} ${estilo} hidden sm:inline-flex`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
      </a>
    </div>
  )
}
