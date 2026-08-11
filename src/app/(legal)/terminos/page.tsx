// Author: Angel Colman
import Markdown from 'react-markdown'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Bases y condiciones | Automotor Play',
  description:
    'Bases y condiciones de participación en los juegos de Automotor Play.',
}

export default async function TerminosPage() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
    select: { platformTerms: true },
  })

  if (!settings?.platformTerms) {
    return (
      <>
        <h2>Bases y condiciones</h2>
        <p>
          Todavía no hay bases publicadas. Escribinos por los canales de contacto de
          Automotor S.A. si necesitás esta información.
        </p>
      </>
    )
  }

  return <Markdown>{settings.platformTerms}</Markdown>
}
