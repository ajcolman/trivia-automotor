// Author: Angel Colman
import { generateClientTokenFromReadWriteToken } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Configuración de Blob faltante' }, { status: 500 })
  }

  const clientToken = await generateClientTokenFromReadWriteToken({
    token: process.env.BLOB_READ_WRITE_TOKEN,
    payload: JSON.stringify({
      /* optional: add user ID or other data to restrict upload */
    }),
  })

  return NextResponse.json({ clientToken })
}
