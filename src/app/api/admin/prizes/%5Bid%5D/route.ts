// Author: Angel Colman
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireAuth()
    if (error) return error

    const { name, description, position } = await req.json()

    const prize = await prisma.prize.update({
      where: { id: params.id },
      data: {
        name,
        description,
        position: Number(position),
      }
    })

    return NextResponse.json(prize)
  } catch (error) {
    console.error('Error updating prize:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireAuth()
    if (error) return error

    await prisma.prize.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prize:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
