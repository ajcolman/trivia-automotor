// Author: Angel Colman
'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { cn, mediaUrl } from '@/lib/utils'

interface UploadDropzoneProps {
  value?: string | null
  onUpload: (url: string) => void
  label?: string
  accept?: Record<string, string[]>
  maxSize?: number
  className?: string
}

export function UploadDropzone({
  value,
  onUpload,
  label = 'Arrastra una imagen o haz clic para seleccionar',
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
  maxSize = 5 * 1024 * 1024,
  className,
}: UploadDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    setIsUploading(true)
    setError(null)

    try {
      // 1. Try direct upload to Vercel Blob if in production
      if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        try {
          const { put } = await import('@vercel/blob/client')
          
          // Get token first
          const tokenRes = await fetch(`/api/admin/assets/upload/token?pathname=${file.name}`)
          const tokenData = await tokenRes.json()
          if (!tokenRes.ok) throw new Error(tokenData.error)

          const blob = await put(file.name, file, {
            access: 'public',
            token: tokenData.clientToken
          })
          
          // Register asset in DB (server-side)
          const regRes = await fetch('/api/admin/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              url: blob.url,
              fileType: file.type,
              sizeBytes: file.size
            })
          })
          const regData = await regRes.json()
          if (!regRes.ok) throw new Error(regData.error)
          
          onUpload(blob.url)
          return
        } catch (blobErr) {
          console.warn('Direct upload failed, falling back to server upload', blobErr)
        }
      }

      // 2. Fallback to server-side upload
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/assets/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al subir')
      onUpload(data.url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir el archivo')
    } finally {
      setIsUploading(false)
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0]
      if (err?.code === 'file-too-large') setError('El archivo excede el tamaño máximo (5MB).')
      else if (err?.code === 'file-invalid-type') setError('Tipo de archivo no permitido.')
      else setError('Archivo rechazado.')
    },
  })

  return (
    <div className={cn('space-y-2', className)}>
      {value ? (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50">
          <Image src={mediaUrl(value)} alt="Preview" fill className="object-contain p-2" unoptimized />
          <button
            type="button"
            onClick={() => onUpload('')}
            className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all',
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50',
            isUploading && 'opacity-50 pointer-events-none'
          )}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
          ) : (
            <>
              {isDragActive ? (
                <Upload className="w-8 h-8 text-blue-500 mb-2" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
              )}
              <p className="text-sm text-slate-500 text-center px-4">{label}</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP, SVG · máx. 5MB</p>
            </>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
