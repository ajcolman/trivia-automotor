// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Form data inválido' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Use PNG, JPG, WebP o SVG.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo excede el límite de 5MB.' }, { status: 400 })
  }

  let url: string

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Vercel Blob — private store: upload with access:'private', serve via /api/media proxy
    try {
      const { put } = await import('@vercel/blob')
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const safeName = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const blob = await put(safeName, file, { access: 'private', addRandomSuffix: false })
      // Store the raw blob URL; /api/media will serve it using the server-side token
      url = blob.url
    } catch (blobErr: unknown) {
      const msg = blobErr instanceof Error ? blobErr.message : String(blobErr)
      return NextResponse.json({ error: `Error al subir: ${msg}` }, { status: 500 })
    }
  } else {
    // Local filesystem fallback (development)
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, filename), buffer)
      url = `/uploads/${filename}`
    } catch {
      return NextResponse.json(
        { error: 'No se pudo guardar el archivo. En producción configurá BLOB_READ_WRITE_TOKEN.' },
        { status: 500 },
      )
    }
  }

  const asset = await prisma.asset.create({
    data: {
      name: file.name.slice(0, 255),
      url,
      fileType: file.type,
      sizeBytes: file.size,
      uploadedBy: session.user.id,
    },
  })

  return NextResponse.json({ url, id: asset.id }, { status: 201 })
}
