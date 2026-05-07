// Author: Angel Colman
'use client'

import { useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface TriviaResetButtonProps {
  triviaId: string
  triviaTitle: string
  leadsCount: number
}

export function TriviaResetButton({ triviaId, triviaTitle, leadsCount }: TriviaResetButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/trivias/${triviaId}/reset`, { method: 'DELETE' })
    if (res.ok) {
      const data = await res.json()
      setOpen(false)
      // Refresh to update lead count
      window.location.reload()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Error al resetear')
    }
    setLoading(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        title="Resetear datos de prueba"
        className="text-orange-400 hover:text-orange-600 hover:bg-orange-50"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-500" />
              Resetear datos de prueba
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Vas a eliminar todos los datos de prueba de{' '}
              <strong>"{triviaTitle}"</strong>:
            </p>
            <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside bg-orange-50 rounded-xl p-3">
              <li><strong>{leadsCount}</strong> contacto{leadsCount !== 1 ? 's' : ''} registrado{leadsCount !== 1 ? 's' : ''}</li>
              <li>Sesiones de juego</li>
              <li>Vistas de página</li>
            </ul>
            <p className="text-xs text-slate-400">
              Esta acción es irreversible. Solo disponible mientras la trivia está <strong>inactiva</strong>.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleReset}
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, resetear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
