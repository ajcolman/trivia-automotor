// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { questionId, chosen } = await req.json()

    if (!questionId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { correctAnswer: true }
    })

    if (!question) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      correct: question.correctAnswer === chosen,
      correctAnswer: question.correctAnswer
    })
  } catch (error) {
    console.error('Check answer error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
