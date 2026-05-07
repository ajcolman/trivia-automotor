// Author: Angel Colman
// Proxy for private Vercel Blob assets — fetches blobs server-side using the
// write token and streams them to the browser with long-lived cache headers.
import { NextRequest, NextResponse } from 'next/server'

const BLOB_ORIGIN = 'vercel-storage.com'

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  // Only proxy Vercel Blob URLs — reject anything else to prevent open-redirect abuse
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  if (!parsed.hostname.endsWith(BLOB_ORIGIN)) {
    return new NextResponse('URL not allowed', { status: 403 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return new NextResponse('Storage not configured', { status: 500 })
  }

  try {
    const blobRes = await fetch(rawUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!blobRes.ok) {
      return new NextResponse('Blob not found', { status: blobRes.status })
    }

    const contentType = blobRes.headers.get('content-type') ?? 'application/octet-stream'
    const body = await blobRes.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache aggressively — images rarely change
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Error fetching blob', { status: 502 })
  }
}
