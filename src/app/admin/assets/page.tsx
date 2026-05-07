// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Trash2, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UploadDropzone } from '@/components/admin/UploadDropzone'

interface Asset {
  id: string; name: string; url: string; fileType: string
  sizeBytes: number; createdAt: string; uploader: { name: string }
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [copied, setCopied] = useState<string | null>(null)

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
    if (!confirm('¿Eliminar este archivo?')) return
    await fetch('/api/admin/assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-800">Archivos / Logos</h1>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">Subir nuevo archivo</p>
          <div className="max-w-sm">
            <UploadDropzone
              value={null}
              onUpload={() => load()}
              label="Arrastra imágenes aquí"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {assets.map(asset => (
          <div key={asset.id} className="group relative bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-square bg-slate-50 flex items-center justify-center p-2">
              <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
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
                onClick={() => deleteAsset(asset.id)}
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
    </div>
  )
}
