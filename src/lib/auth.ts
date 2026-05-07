import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations/user'

// Dummy hash for constant-time compare when user is not found
// Prevents user enumeration via timing attacks
const DUMMY_HASH =
  '$2a$12$LCU4VMh/fSsY5lZJo7MNTOomvdBqXimMLXqkMolDIHBBfaJaGX5sK'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
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
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
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
