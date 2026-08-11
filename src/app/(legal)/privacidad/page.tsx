// Author: Angel Colman
import Markdown from 'react-markdown'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Política de privacidad | Automotor Play',
  description:
    'Cómo Automotor S.A. y Carmotor S.A. tratan los datos personales de quienes juegan en Automotor Play.',
}

export default async function PrivacidadPage() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
    select: { privacyPolicy: true },
  })

  if (!settings?.privacyPolicy) {
    return (
      <>
        <h2>Política de privacidad</h2>
        <p>
          Todavía no hay una política publicada. Escribinos por los canales de contacto de
          Automotor S.A. si necesitás esta información.
        </p>
      </>
    )
  }

  return <Markdown>{settings.privacyPolicy}</Markdown>
}
