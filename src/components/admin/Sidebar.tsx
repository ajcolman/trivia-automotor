// Author: Angel Colman
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Trophy, Copy, Users, Image as ImageIcon,
  Building2, Car, UserCog, LogOut, ChevronRight, X, Menu, Settings, Home,
  Swords, Gamepad2
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
  { href: '/admin/tournaments', label: 'Torneos', icon: Swords },
  { href: '/admin/sprites', label: 'Sprites Vehículos', icon: Gamepad2 },
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
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          active
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
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
      <div className="px-5 py-5 border-b border-white/5">
        <Link href="/admin/dashboard" className="flex items-center justify-center">
          <Image
            src="/uploads/logoa.png"
            alt="Automotor"
            width={148}
            height={48}
            className="h-9 w-auto object-contain brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
            unoptimized
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => <NavItem key={item.href} {...item} />)}

        {isSuperAdmin && (
          <>
            <div className="px-3 pt-5 pb-1.5">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Super Admin</span>
            </div>
            {superAdminItems.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Back to site */}
      <div className="px-3 pb-2">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-700/60 transition-all"
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          <span>Ir al sitio</span>
        </Link>
      </div>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-inner"
            style={{ background: 'linear-gradient(135deg, #003087, #0052cc)' }}
          >
            {getInitials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user.name}</p>
            <p className="text-slate-400 text-xs truncate">
              {user.role === 'super_admin' ? 'Super Admin' : 'Administrador'}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
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
      <aside
        className="hidden lg:flex flex-col w-60 flex-shrink-0 min-h-screen"
        style={{ background: 'linear-gradient(180deg, #0d1b3e 0%, #0a1628 100%)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #003087, #0052cc)' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative w-60 h-full"
            style={{ background: 'linear-gradient(180deg, #0d1b3e 0%, #0a1628 100%)' }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
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
