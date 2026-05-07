// Author: Angel Colman
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Trophy, Copy, Users, Image as ImageIcon,
  Building2, Car, UserCog, LogOut, ChevronRight, X, Menu, Settings
} from 'lucide-react'
import { useState } from 'react'
import { cn, getInitials } from '@/lib/utils'

interface SidebarProps {
  user: { name: string; email: string; role: string }
}

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/trivias', label: 'Trivias', icon: Trophy },
  { href: '/admin/templates', label: 'Plantillas', icon: Copy },
  { href: '/admin/assets', label: 'Archivos', icon: ImageIcon },
]

const superAdminItems = [
  { href: '/admin/companies', label: 'Empresas', icon: Building2 },
  { href: '/admin/brands', label: 'Marcas', icon: Car },
  { href: '/admin/users', label: 'Usuarios', icon: UserCog },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isSuperAdmin = user.role === 'super_admin'

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
          active
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
        {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-700/50">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-black text-sm leading-tight">Automotor</div>
            <div className="text-slate-400 text-xs">Trivia Admin</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => <NavItem key={item.href} {...item} />)}

        {isSuperAdmin && (
          <>
            <div className="px-4 py-2 mt-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Super Admin</span>
            </div>
            {superAdminItems.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-700/30">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{getInitials(user.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user.name}</p>
            <p className="text-slate-400 text-xs truncate">{user.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="text-slate-400 hover:text-red-400 transition-colors p-1"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-800 flex-shrink-0 min-h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-slate-800 h-full">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
