/**
 * Seed Hyundai vehicle sprites into the database.
 * Run with: npx tsx scripts/seed-hyundai-sprites.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SPRITES = [
  { modelName: 'Grand i10 Hatchback', spriteUrl: '/sprites/hyundai-i10-hatch.svg' },
  { modelName: 'Grand i10 Sedán',      spriteUrl: '/sprites/hyundai-i10-sedan.svg' },
  { modelName: 'New HB20 Hatch',       spriteUrl: '/sprites/hyundai-hb20-hatch.svg' },
  { modelName: 'New HB20 Sedán',       spriteUrl: '/sprites/hyundai-hb20-sedan.svg' },
  { modelName: 'New Creta',            spriteUrl: '/sprites/hyundai-creta.svg' },
  { modelName: 'Tucson',               spriteUrl: '/sprites/hyundai-tucson.svg' },
  { modelName: 'New Tucson',           spriteUrl: '/sprites/hyundai-new-tucson.svg' },
  { modelName: 'All-new Santa Fe',     spriteUrl: '/sprites/hyundai-santa-fe.svg' },
  { modelName: 'New Kona',             spriteUrl: '/sprites/hyundai-kona.svg' },
  { modelName: 'Venue',                spriteUrl: '/sprites/hyundai-venue.svg' },
  { modelName: 'Stargazer',            spriteUrl: '/sprites/hyundai-stargazer.svg' },
  { modelName: 'Kona Electric',        spriteUrl: '/sprites/hyundai-kona-electric.svg' },
]

async function main() {
  // Try to find an existing Hyundai brand, else insert sprites without brandId
  const hyundaiBrand = await prisma.brand.findFirst({
    where: { name: { contains: 'Hyundai', mode: 'insensitive' } },
  })

  if (hyundaiBrand) {
    console.log(`Found brand: ${hyundaiBrand.name} (${hyundaiBrand.id})`)
  } else {
    console.log('No Hyundai brand found — sprites will be inserted without brandId.')
  }

  let created = 0
  let skipped = 0

  for (const sprite of SPRITES) {
    const exists = await prisma.vehicleSprite.findFirst({
      where: { spriteUrl: sprite.spriteUrl },
    })

    if (exists) {
      console.log(`  skip  ${sprite.modelName} (already exists)`)
      skipped++
      continue
    }

    await prisma.vehicleSprite.create({
      data: {
        brandId:   hyundaiBrand?.id ?? null,
        modelName: sprite.modelName,
        spriteUrl: sprite.spriteUrl,
        isGeneric: false,
      },
    })

    console.log(`  added ${sprite.modelName}`)
    created++
  }

  console.log(`\nDone — ${created} added, ${skipped} skipped.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
