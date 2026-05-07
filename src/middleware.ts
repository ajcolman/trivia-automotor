import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // ── Role-based route protection ──────────────────────────────────────────
    // /admin/users is only accessible by super_admin
    if (pathname.startsWith('/admin/users') && token?.role !== 'super_admin') {
      const url = req.nextUrl.clone()
      url.pathname = '/admin'
      url.searchParams.set('error', 'insufficient_permissions')
      return NextResponse.redirect(url)
    }

    // /admin/companies is only accessible by super_admin
    if (pathname.startsWith('/admin/companies') && token?.role !== 'super_admin') {
      const url = req.nextUrl.clone()
      url.pathname = '/admin'
      url.searchParams.set('error', 'insufficient_permissions')
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      /**
       * Return `true` to allow the middleware function to run.
       * If the token is missing the middleware redirects to the sign-in page
       * automatically (handled by NextAuth's withAuth).
       */
      authorized({ token }) {
        return token !== null
      },
    },
    pages: {
      signIn: '/admin/login',
    },
  },
)

export const config = {
  matcher: [
    /*
     * Protect all /admin/* routes EXCEPT /admin/login.
     *
     * Negative lookahead `(?!login)` prevents the matcher from protecting the
     * sign-in page itself (which would cause an infinite redirect loop).
     */
    '/admin/((?!login).*)',
  ],
}
