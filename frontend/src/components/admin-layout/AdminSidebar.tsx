import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Building2, CreditCard, Users,
  TrendingUp, Settings, LogOut, Shield, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/services/auth.service'
import { useAdminAuthStore } from '@/store/adminAuthStore'

const NAV_ITEMS = [
  { to: '/admin',           label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/companies', label: 'Empresas',   icon: Building2 },
  { to: '/admin/plans',     label: 'Planos',     icon: CreditCard },
  { to: '/admin/users',     label: 'Usuários',   icon: Users },
  { to: '/admin/revenue',   label: 'Financeiro', icon: TrendingUp },
  { to: '/admin/settings',  label: 'Config.',    icon: Settings },
]

interface Props {
  mobileOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ mobileOpen, onClose }: Props) {
  const navigate = useNavigate()
  const { admin } = useAdminAuthStore()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-60 flex-col lg:static lg:z-auto lg:translate-x-0',
          'transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'linear-gradient(180deg, #1a1d2e 0%, #151821 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Minha Ótica</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#8b5cf6' }}>
              Super Admin
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-slate-500 hover:text-slate-300 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
                )
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.3)',
              } : {}}
            >
              <Icon size={17} className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          {admin && (
            <Link
              to="/admin/profile"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors hover:bg-white/5 group"
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {admin.avatar_url ? (
                  <img src={admin.avatar_url} alt={admin.full_name} className="h-full w-full object-cover" />
                ) : (
                  admin.full_name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">{admin.full_name}</p>
                <p className="text-[10px] text-slate-500 truncate">Super Admin</p>
              </div>
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
