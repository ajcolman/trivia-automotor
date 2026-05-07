// Author: Angel Colman
import { prisma } from '@/lib/prisma'
import { TriviaEditor } from '@/components/admin/TriviaEditor'

export default async function NewTriviaPage() {
  const [companies, brands] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.brand.findMany({ where: { isActive: true }, select: { id: true, name: true, companyId: true, models: true } }),
  ])

  return (
    <TriviaEditor
      trivia={null}
      companies={companies}
      brands={brands.map(b => ({ ...b, models: b.models as string[] }))}
      mode="create"
    />
  )
}
