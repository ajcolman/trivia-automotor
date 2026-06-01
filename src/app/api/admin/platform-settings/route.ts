// Author: Angel Colman
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'

export async function GET(_req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const settings = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })
  return NextResponse.json(settings ?? { platformTerms: '', privacyPolicy: '' })
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth(true) // super_admin only
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const settings = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    update: {
      platformTerms: body.platformTerms ?? undefined,
      privacyPolicy: body.privacyPolicy ?? undefined,
      heroImageUrl: body.heroImageUrl ?? undefined,
      heroImageSettings: body.heroImageSettings ?? undefined,
    },
    create: {
      id: 'singleton',
      platformTerms: body.platformTerms ?? '',
      privacyPolicy: body.privacyPolicy ?? '',
      heroImageUrl: body.heroImageUrl ?? null,
      heroImageSettings: body.heroImageSettings ?? null,
    },
  } as any)

  await logAudit({
    entityType: 'PlatformSettings', entityId: 'singleton', entityName: 'Configuración de plataforma',
    action: 'UPDATE', userId: session!.user.id, userName: session!.user.name ?? '', userEmail: session!.user.email ?? '',
  })

  return NextResponse.json(settings)
}
