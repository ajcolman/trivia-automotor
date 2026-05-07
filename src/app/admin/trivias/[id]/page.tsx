// Author: Angel Colman
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TriviaEditor } from '@/components/admin/TriviaEditor'

interface PageProps { params: { id: string } }

export default async function EditTriviaPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  const userId = (session!.user as { id: string }).id
  const role = (session!.user as { role: string }).role

  const trivia = await prisma.trivia.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
      formFields: { orderBy: { orderIndex: 'asc' } },
      prizes: { orderBy: { position: 'asc' } },
      flyers: true,
    },
  })

  if (!trivia) notFound()
  if (role !== 'super_admin' && trivia.createdBy !== userId) notFound()

  const [companies, brands] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.brand.findMany({ where: { isActive: true }, select: { id: true, name: true, companyId: true, models: true } }),
  ])

  return (
    <TriviaEditor
      trivia={JSON.parse(JSON.stringify(trivia))}
      companies={companies}
      brands={brands.map(b => ({ ...b, models: b.models as string[] }))}
      mode="edit"
    />
  )
}
