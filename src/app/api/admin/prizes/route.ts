// Author: Angel Colman
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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
