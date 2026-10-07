// Author: Angel Colman
/**
 * Registra la D-Max de rally animada en el catálogo de sprites.
 *
 * Idempotente: se puede correr de nuevo sin duplicarla.
 *
 *   npx tsx prisma/seed-sprite-dmax.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const marca = await prisma.brand.findFirst({
    where: { name: 'Isuzu' },
    select: { id: true, name: true },
  })
  if (!marca) throw new Error('No se encontró la marca Isuzu')

  const datos = {
    brandId: marca.id,
    modelName: 'D-Max Rally',
    spriteUrl: '/sprites/dmax-rally-still.png',
    loopUrl: '/sprites/dmax-rally-loop.gif',
    posterUrl: '/sprites/dmax-rally-still.png',
    // El GIF lleva su propia transparencia, así que no hace falta recortarlo
    // contra el fondo: se ve limpio sobre el banner y sobre el degradado.
    blackBackground: false,
    isGeneric: false,
  }

  const existente = await prisma.vehicleSprite.findFirst({
    where: { brandId: marca.id, modelName: datos.modelName },
    select: { id: true },
  })

  const sprite = existente
    ? await prisma.vehicleSprite.update({ where: { id: existente.id }, data: datos })
    : await prisma.vehicleSprite.create({ data: datos })

  console.log(`${existente ? 'Actualizada' : 'Creada'}: ${marca.name} · ${sprite.modelName}`)
}

main()
  .catch(e => { console.error('FALLO:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
