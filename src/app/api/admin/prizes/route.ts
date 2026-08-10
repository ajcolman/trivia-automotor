// Author: Angel Colman
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { error } = await requireAuth()
    if (error) return error

    const { triviaId, name, description, imageUrl, position } = await req.json()

    if (!triviaId || !name) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const prize = await prisma.prize.create({
      data: {
        triviaId,
        name,
        description,
        imageUrl: imageUrl || null,
        position: Number(position),
      }
    })

    return NextResponse.json(prize)
  } catch (error) {
    console.error('Error creating prize:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
