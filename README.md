Author: Angel Colman

# Automotor Trivia Platform

Plataforma de trivias interactivas para Automotor S.A. y Carmotor S.A.

## Desarrollado por Angel Colman

## Stack
- **Framework**: Next.js 14 (App Router)
- **Base de datos**: PostgreSQL (Neon)
- **ORM**: Prisma 5
- **Auth**: NextAuth.js v4
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: Vercel

## Inicio rápido

```bash
npm install
cp .env.local.example .env.local  # configurar variables
npm run db:push
npm run db:seed
npm run dev
```

## Credenciales iniciales
- Email: admin@automotor.com.py
- Password: Admin1234! (cambiar en primer login)

## Estructura
- `/` - Landing page pública con trivias activas
- `/play/[slug]` - Jugar una trivia
- `/admin` - Panel de administración
