import { prisma } from '@/lib/prisma'
import { AuditAction } from '@prisma/client'

interface AuditOptions {
  entityType: string
  entityId: string
  entityName?: string
  action: AuditAction
  userId: string
  userName: string
  userEmail: string
}

export async function logAudit(opts: AuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({ data: opts })
  } catch {
    // Audit failures must never break the main operation
    console.error('[audit] failed to write log', opts)
  }
}
