import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations/user'
import { playerLoginSchema } from '@/lib/validations/player'

// Dummy hash for constant-time compare when user is not found
// Prevents user enumeration via timing attacks
const DUMMY_HASH =
  '$2a$12$LCU4VMh/fSsY5lZJo7MNTOomvdBqXimMLXqkMolDIHBBfaJaGX5sK'

/** Ventana de sesión de los administradores. */
const ADMIN_MAX_AGE_S = 8 * 60 * 60
/**
 * Ventana de la cookie. Es larga porque los jugadores vuelven a lo largo de un
 * fin de semana de carrera y no queremos echarlos entre tramo y tramo. Los
 * administradores siguen limitados a ADMIN_MAX_AGE_S por el callback `jwt`.
 */
const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60

const ADMIN_ROLES = ['admin', 'super_admin']

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_S,
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },

  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 1. Validate shape with Zod first
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // 2. Look up user
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        })

        // 3. Always run bcrypt compare to prevent timing attacks
        //    even when the user does not exist.
        const hashToCompare = user?.passwordHash ?? DUMMY_HASH
        const passwordMatch = await bcrypt.compare(password, hashToCompare)

        // 4. Bail out if user missing, inactive, or password wrong
        if (!user || !user.isActive || !passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),

    /**
     * Jugadores. Tabla `Player`, completamente separada de `User`: un cliente
     * nunca comparte fila ni rol con un administrador, así un error en un
     * chequeo de permisos no puede convertirlo en admin.
     */
    CredentialsProvider({
      id: 'player',
      name: 'Jugador',
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = playerLoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const player = await prisma.player.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            fullName: true,
            passwordHash: true,
            isActive: true,
          },
        })

        // Comparación siempre, exista o no la cuenta, para no filtrar por
        // tiempo de respuesta qué correos están registrados.
        const hashToCompare = player?.passwordHash ?? DUMMY_HASH
        const passwordMatch = await bcrypt.compare(password, hashToCompare)

        if (!player || !player.isActive || !passwordMatch) return null

        await prisma.player.update({
          where: { id: player.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: player.id,
          email: player.email,
          name: player.fullName,
          role: 'player',
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.loginAt = Math.floor(Date.now() / 1000)
      }

      // La cookie dura un mes por los jugadores, pero la sesión de un
      // administrador sigue caducando a las 8 horas: al vencer se le quita el
      // rol y el middleware lo manda a iniciar sesión de nuevo.
      if (typeof token.role === 'string' && ADMIN_ROLES.includes(token.role)) {
        const loginAt = typeof token.loginAt === 'number' ? token.loginAt : 0
        if (Math.floor(Date.now() / 1000) - loginAt > ADMIN_MAX_AGE_S) {
          delete (token as { role?: unknown }).role
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },

  debug: process.env.NODE_ENV === 'development',
}
