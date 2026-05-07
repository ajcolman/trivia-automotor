import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SALT_ROUNDS = 12

async function main() {
  console.log('🌱 Starting database seed...')

  // ── 1. Companies ──────────────────────────────────────────────────────────

  const automotor = await prisma.company.upsert({
    where: { slug: 'automotor' },
    update: {},
    create: {
      name: 'Automotor S.A.',
      slug: 'automotor',
      description: 'Concesionaria oficial Hyundai en Paraguay',
      isActive: true,
    },
  })
  console.log(`  Company created/found: ${automotor.name} (${automotor.id})`)

  const carmotor = await prisma.company.upsert({
    where: { slug: 'carmotor' },
    update: {},
    create: {
      name: 'Carmotor S.A.',
      slug: 'carmotor',
      description: 'Concesionaria automotriz en Paraguay',
      isActive: true,
    },
  })
  console.log(`  Company created/found: ${carmotor.name} (${carmotor.id})`)

  // ── 2. Brands ─────────────────────────────────────────────────────────────

  // Automotor → Hyundai
  const hyundai = await prisma.brand.upsert({
    where: {
      companyId_name: {
        companyId: automotor.id,
        name: 'Hyundai',
      },
    },
    update: {},
    create: {
      companyId: automotor.id,
      name: 'Hyundai',
      models: ['HB20', 'Creta', 'Tucson', 'Santa Fe', 'Palisade', 'Staria'],
      isActive: true,
    },
  })
  console.log(`  Brand created/found: ${hyundai.name} for ${automotor.name}`)

  // Carmotor → Otras Marcas (placeholder)
  const otrasMarcas = await prisma.brand.upsert({
    where: {
      companyId_name: {
        companyId: carmotor.id,
        name: 'Otras Marcas',
      },
    },
    update: {},
    create: {
      companyId: carmotor.id,
      name: 'Otras Marcas',
      models: [],
      isActive: true,
    },
  })
  console.log(`  Brand created/found: ${otrasMarcas.name} for ${carmotor.name}`)

  // ── 3. Super Admin user ───────────────────────────────────────────────────

  const superAdminEmail = 'admin@automotor.com.py'
  const plainPassword = 'Admin1234!'
  const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS)

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash,
      name: 'Super Administrador',
      role: 'super_admin',
      companyId: automotor.id,
      isActive: true,
    },
  })
  console.log(`  User created/found: ${superAdmin.name} <${superAdmin.email}> [${superAdmin.role}]`)

  // ── Done ──────────────────────────────────────────────────────────────────

  console.log('\n✅ Seed completed successfully!')
  console.log('\nSeed summary:')
  console.log(`  Companies : Automotor S.A. (${automotor.id}), Carmotor S.A. (${carmotor.id})`)
  console.log(`  Brands    : Hyundai (models: HB20, Creta, Tucson, Santa Fe, Palisade, Staria)`)
  console.log(`              Otras Marcas (placeholder for Carmotor)`)
  console.log(`  Super admin email    : ${superAdminEmail}`)
  console.log(`  Super admin password : ${plainPassword}`)
  console.log('\n⚠️  Change the default password after first login!')
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
