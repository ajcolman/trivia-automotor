// Author: Angel Colman
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SALT_ROUNDS = 12

// Logo URL served from public/uploads (copied from assets/)
const AUTOMOTOR_LOGO = '/uploads/logoa.png'

async function main() {
  console.log('🌱 Starting database seed...')

  // ── 1. Companies ──────────────────────────────────────────────────────────

  const automotor = await prisma.company.upsert({
    where: { slug: 'automotor' },
    update: { logoUrl: AUTOMOTOR_LOGO },
    create: {
      name: 'Automotor S.A.',
      slug: 'automotor',
      description: 'Concesionaria oficial de vehículos en Paraguay. Representantes de Hyundai, Isuzu, Maserati, Geely, Lotus, Mahindra y Lynk & Co.',
      logoUrl: AUTOMOTOR_LOGO,
      isActive: true,
    },
  })
  console.log(`  ✓ Company: ${automotor.name}`)

  const carmotor = await prisma.company.upsert({
    where: { slug: 'carmotor' },
    update: {},
    create: {
      name: 'Carmotor S.A.',
      slug: 'carmotor',
      description: 'Concesionaria automotriz en Paraguay. Representantes de KGM.',
      isActive: true,
    },
  })
  console.log(`  ✓ Company: ${carmotor.name}`)

  // ── 2. Brands (sin modelos — el admin los carga desde el panel) ───────────

  const brandDefs: Array<{ companyId: string; name: string }> = [
    // AUTOMOTOR
    { companyId: automotor.id, name: 'Hyundai' },
    { companyId: automotor.id, name: 'Isuzu' },
    { companyId: automotor.id, name: 'Maserati' },
    { companyId: automotor.id, name: 'Geely' },
    { companyId: automotor.id, name: 'Lotus' },
    { companyId: automotor.id, name: 'Mahindra' },
    { companyId: automotor.id, name: 'Lynk & Co' },
    // CARMOTOR
    { companyId: carmotor.id, name: 'KGM' },
  ]

  for (const def of brandDefs) {
    const brand = await prisma.brand.upsert({
      where: { companyId_name: { companyId: def.companyId, name: def.name } },
      update: {},
      create: { ...def, models: [], isActive: true },
    })
    const company = def.companyId === automotor.id ? 'Automotor' : 'Carmotor'
    console.log(`  ✓ Brand: ${brand.name} → ${company}`)
  }

  // ── 3. Super Admin ────────────────────────────────────────────────────────

  const superAdminEmail = 'angelcolman2@hotmail.com'
  const plainPassword = 'Admin1234!'

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash: await bcrypt.hash(plainPassword, SALT_ROUNDS),
      name: 'Super Administrador',
      role: 'super_admin',
      companyId: automotor.id,
      isActive: true,
    },
  })
  console.log(`  ✓ Super admin: ${superAdmin.email}`)

  // ── 4. Primera Trivia: Mundial 2026 ───────────────────────────────────────

  const hyundaiBrand = await prisma.brand.findFirst({
    where: { companyId: automotor.id, name: 'Hyundai' },
  })

  const trivia = await prisma.trivia.upsert({
    where: { slug: 'mundial-2026-automotor' },
    update: {},
    create: {
      title: 'Trivia Mundial 2026',
      slug: 'mundial-2026-automotor',
      description: '¡Ponete a prueba con todo lo que sabés sobre el Mundial de Fútbol 2026! Respondé rápido y ganá increíbles premios de Automotor.',
      logoUrl: AUTOMOTOR_LOGO,
      companyId: automotor.id,
      brands: { connect: hyundaiBrand ? [{ id: hyundaiBrand.id }] : [] },
      primaryColor: '#003087',
      secondaryColor: '#002060',
      accentColor: '#FFD700',
      backgroundColor: '#F8FAFC',
      textColor: '#1A1A2E',
      isActive: true,
      isPublic: true,
      maxPlaysPerUser: 1,
      gameInstructions: `## ¿Cómo jugar?

1. **Leé bien cada pregunta** antes de responder.
2. Tenés un tiempo limitado por pregunta — ¡más rápido respondas, más puntos ganás!
3. La **velocidad de respuesta** suma puntos extra: respondé en los primeros segundos para obtener el máximo de puntos.
4. Al terminar, completá tus datos para quedar en el ranking y participar por los premios.
5. Solo se permite **una participación por persona**.

¡Mucha suerte! ⚽🏆`,
      termsAndConditions: `## Términos y Condiciones — Trivia Mundial 2026

**Organizador:** Automotor S.A.

### Participación
- La trivia está abierta al público en general mayores de 18 años.
- Cada participante puede jugar **una sola vez**.
- Al completar la trivia, el participante acepta el tratamiento de sus datos personales conforme a la política de privacidad de Automotor S.A.

### Premios
- Los premios serán entregados a los ganadores del ranking final.
- Automotor S.A. se reserva el derecho de verificar la identidad del ganador antes de la entrega del premio.

### Descalificación
- El uso de herramientas automatizadas o cualquier método que intente manipular los resultados resultará en la descalificación inmediata.

### Datos Personales
- Los datos recopilados serán utilizados exclusivamente para contacto comercial y entrega de premios.

*Automotor S.A. — Paraguay*`,
      createdBy: superAdmin.id,
    },
  })
  console.log(`  ✓ Trivia: "${trivia.title}" (slug: ${trivia.slug})`)

  // ── 5. Preguntas de la trivia Mundial 2026 ────────────────────────────────

  const existingCount = await prisma.question.count({ where: { triviaId: trivia.id } })

  if (existingCount === 0) {
    const questions = [
      {
        question: '¿En qué países se realizará el Mundial de Fútbol 2026?',
        options: ['Estados Unidos, México y Canadá', 'Estados Unidos y México', 'Brasil, Argentina y Uruguay', 'Europa y Norteamérica'],
        correctAnswer: 0,
        points: 100,
        timeLimit: 20,
      },
      {
        question: '¿Cuántos equipos participarán en el Mundial 2026, marcando un récord histórico?',
        options: ['32 equipos', '40 equipos', '48 equipos', '36 equipos'],
        correctAnswer: 2,
        points: 100,
        timeLimit: 20,
      },
      {
        question: '¿Qué selección es la actual campeona del mundo (2022)?',
        options: ['Francia', 'Brasil', 'Alemania', 'Argentina'],
        correctAnswer: 3,
        points: 100,
        timeLimit: 15,
      },
      {
        question: '¿Quién fue el máximo goleador del Mundial Qatar 2022?',
        options: ['Lionel Messi', 'Kylian Mbappé', 'Olivier Giroud', 'Julián Álvarez'],
        correctAnswer: 1,
        points: 100,
        timeLimit: 20,
      },
      {
        question: '¿Cuántos goles marcó Kylian Mbappé en el Mundial 2022?',
        options: ['6 goles', '7 goles', '8 goles', '9 goles'],
        correctAnswer: 2,
        points: 100,
        timeLimit: 20,
      },
      {
        question: '¿En qué estadio se jugará la final del Mundial 2026?',
        options: ['Rose Bowl — Los Ángeles', 'MetLife Stadium — Nueva York/Nueva Jersey', 'AT&T Stadium — Dallas', 'Estadio Azteca — Ciudad de México'],
        correctAnswer: 1,
        points: 150,
        timeLimit: 25,
      },
      {
        question: '¿Cuál es el país que más Mundiales de Fútbol ha ganado en la historia?',
        options: ['Alemania', 'Argentina', 'Italia', 'Brasil'],
        correctAnswer: 3,
        points: 100,
        timeLimit: 15,
      },
      {
        question: '¿En qué año jugó Paraguay su última Copa del Mundo?',
        options: ['2006', '2010', '2014', '2018'],
        correctAnswer: 1,
        points: 150,
        timeLimit: 20,
      },
      {
        question: '¿Qué jugador obtuvo el Balón de Oro en el Mundial Qatar 2022?',
        options: ['Kylian Mbappé', 'Luka Modrić', 'Lionel Messi', 'Emiliano Martínez'],
        correctAnswer: 2,
        points: 100,
        timeLimit: 20,
      },
      {
        question: '¿Cuántas ediciones del Mundial se habrán disputado incluyendo el de 2026?',
        options: ['21ª edición', '22ª edición', '23ª edición', '24ª edición'],
        correctAnswer: 2,
        points: 150,
        timeLimit: 25,
      },
    ]

    for (let i = 0; i < questions.length; i++) {
      await prisma.question.create({
        data: {
          triviaId: trivia.id,
          ...questions[i],
          options: questions[i].options,
          orderIndex: i,
        },
      })
    }
    console.log(`  ✓ Questions: ${questions.length} preguntas del Mundial 2026 creadas`)
  } else {
    console.log(`  ⚠ Questions: ya existían ${existingCount} preguntas, se omitió la creación`)
  }

  // ── 6. Formulario de captura de datos ─────────────────────────────────────

  const existingFields = await prisma.formField.count({ where: { triviaId: trivia.id } })

  if (existingFields === 0) {
    const formFields = [
      { fieldName: 'nombre', fieldLabel: 'Nombre completo', fieldType: 'text' as const, isRequired: true, placeholder: 'Tu nombre y apellido', orderIndex: 0 },
      { fieldName: 'email', fieldLabel: 'Correo electrónico', fieldType: 'email' as const, isRequired: true, placeholder: 'correo@ejemplo.com', orderIndex: 1 },
      { fieldName: 'telefono', fieldLabel: 'Teléfono / Celular', fieldType: 'phone' as const, isRequired: true, placeholder: '0981 000 000', orderIndex: 2 },
      { fieldName: 'ciudad', fieldLabel: 'Ciudad', fieldType: 'text' as const, isRequired: false, placeholder: 'Asunción', orderIndex: 3 },
    ]

    for (const field of formFields) {
      await prisma.formField.create({
        data: { triviaId: trivia.id, ...field },
      })
    }
    console.log(`  ✓ Form fields: ${formFields.length} campos de captura creados`)
  } else {
    console.log(`  ⚠ Form fields: ya existían ${existingFields} campos, se omitió la creación`)
  }

  // ── 7. Premio ─────────────────────────────────────────────────────────────

  const existingPrizes = await prisma.prize.count({ where: { triviaId: trivia.id } })

  if (existingPrizes === 0) {
    await prisma.prize.createMany({
      data: [
        { triviaId: trivia.id, name: '1er Lugar', description: 'Premio especial Automotor — ¡Sorpresa!', position: 1 },
        { triviaId: trivia.id, name: '2do Lugar', description: 'Premio Automotor', position: 2 },
        { triviaId: trivia.id, name: '3er Lugar', description: 'Premio Automotor', position: 3 },
      ],
    })
    console.log('  ✓ Prizes: 3 premios creados')
  } else {
    console.log(`  ⚠ Prizes: ya existían ${existingPrizes} premios, se omitió la creación`)
  }

  // ── Resumen ───────────────────────────────────────────────────────────────

  console.log('\n✅ Seed completado exitosamente!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Super admin  : angelcolman2@hotmail.com')
  console.log('  Contraseña   : Admin1234!')
  console.log('  URL trivia   : /play/mundial-2026-automotor')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ⚠️  Cambiá la contraseña después del primer login!')
  console.log('  ⚠️  Cargá los modelos de cada marca desde /admin/brands')
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
