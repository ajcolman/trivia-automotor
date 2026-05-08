// Author: Angel Colman
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const pathname = searchParams.get('pathname')
  if (!pathname) return NextResponse.json({ error: 'pathname requerido' }, { status: 400 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Configuración de Blob faltante' }, { status: 500 })
  }

  const clientToken = await generateClientTokenFromReadWriteToken({
    token: process.env.BLOB_READ_WRITE_TOKEN,
    pathname,
  })

  return NextResponse.json({ clientToken })
}
