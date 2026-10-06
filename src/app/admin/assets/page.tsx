// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Trash2, Copy, Loader2 } from 'lucide-react'
import { mediaUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UploadDropzone } from '@/components/admin/UploadDropzone'
import { MEDIDAS, textoMedida } from '@/lib/medidas-imagen'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Asset {
  id: string; name: string; url: string; fileType: string
  sizeBytes: number; createdAt: string; uploader: { name: string }
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/admin/assets')
    setAssets(await res.json())
  }

  useEffect(() => { load() }, [])

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  const deleteAsset = async (id: string) => {
    await fetch('/api/admin/assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('Archivo eliminado')
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-800">Archivos / Logos</h1>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">Subir nuevo archivo</p>
          <div className="flex flex-wrap gap-6">
            <div className="max-w-sm flex-1 min-w-[16rem]">
              <UploadDropzone
                value={null}
                onUpload={() => load()}
                label="Arrastra imágenes aquí"
              />
            </div>

            {/* Esta biblioteca es de uso general, así que no hay una medida
                única: se listan las de cada destino para tenerlas a mano al
                preparar el archivo. */}
            <div className="min-w-[14rem]">
              <p className="text-xs font-bold text-slate-500 mb-1.5">Medidas recomendadas</p>
              <dl className="text-xs text-slate-400 space-y-1">
                {([
                  ['Banner / cabecera', MEDIDAS.banner],
                  ['Logo', MEDIDAS.logo],
                  ['Premio', MEDIDAS.premio],
                  ['Flyer', MEDIDAS.flyer],
                ] as const).map(([nombre, m]) => (
                  <div key={nombre} className="flex gap-2">
                    <dt className="w-32 flex-shrink-0">{nombre}</dt>
                    <dd className="font-semibold text-slate-500 tabular-nums">{textoMedida(m)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {assets.map(asset => (
          <div key={asset.id} className="group relative bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-square bg-slate-50 flex items-center justify-center p-2">
              <img src={mediaUrl(asset.url)} alt={asset.name} className="w-full h-full object-contain" />
            </div>
            <div className="p-2">
              <p className="text-xs text-slate-600 truncate font-medium">{asset.name}</p>
              <p className="text-xs text-slate-400">{Math.round(asset.sizeBytes / 1024)}KB</p>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="ghost" size="sm"
                className="text-white hover:bg-white/20 text-xs"
                onClick={() => copyUrl(asset.url)}
              >
                {copied === asset.url ? '✓' : <Copy className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost" size="sm"
                className="text-red-300 hover:bg-white/20"
                onClick={() => setDeleteId(asset.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            No hay archivos subidos aún.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="¿Eliminar archivo?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => { deleteAsset(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
