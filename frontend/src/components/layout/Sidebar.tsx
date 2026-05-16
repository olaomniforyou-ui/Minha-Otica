import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Truck, ArrowLeftRight,
  Users, User, ClipboardList, FlaskConical, BarChart3, Wallet,
  HelpCircle, LogOut, Eye, Menu, X, PlusCircle, Contact, Building2,
  ShoppingBag, Code2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'

interface NavItem { to: string; label: string; icon: React.ElementType }
interface NavGroup { group: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Geral',
    items: [
      { to: '/',           label: 'Dashboard',    icon: LayoutDashboard },
    ]
  },
  {
    group: 'Clientes & CRM',
    items: [
      { to: '/patients',   label: 'Clientes',     icon: Users },
    ]
  },
  {
    group: 'Produtos & Estoque',
    items: [
      { to: '/products',   label: 'Produtos',     icon: Package },
      { to: '/stock',      label: 'Estoque',      icon: ArrowLeftRight },
      { to: '/suppliers',  label: 'Fornecedores', icon: Truck },
    ]
  },
  {
    group: 'Comercial & OS',
    items: [
      { to: '/orders',     label: 'Orçamentos',   icon: ClipboardList },
      { to: '/sales',      label: 'Vendas / PDV', icon: ShoppingCart },
      { to: '/lab',        label: 'Laboratório',  icon: FlaskConical },
    ]
  },
  {
    group: 'Financeiro',
    items: [
      { to: '/financial',  label: 'Financeiro',   icon: Wallet },
    ]
  },
  {
    group: 'Gestão',
    items: [
      { to: '/employees',  label: 'Funcionários', icon: Contact },
      { to: '/analytics',  label: 'Relatórios',   icon: BarChart3 },
    ]
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const navigate  = useNavigate()
  const { 
    profile, 
    company: activeCompany, 
    availableProfiles, 
    setProfile, 
    setCompany 
  } = useAuthStore()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await signOut()
    navigate('/login')
  }

  function handleNewPrescription() {
    navigate('/orders/new')
    onClose()
  }

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-slate-100 shadow-sm',
          'transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-900">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">Minha Ótica</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
              Gestão Óptica
            </p>
          </div>
          {/* Fechar no mobile */}
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-slate-400 hover:text-slate-700 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Atalho rápido */}
          <div className="pt-4 border-t border-slate-50">
            <button
              onClick={handleNewPrescription}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              Novo Orçamento / OS
            </button>
          </div>
        </nav>

        {/* Rodapé */}
        <div className="px-3 py-4 space-y-1 border-t border-slate-100">
          {/* Developer Dashboard link if admin */}
          {profile?.role === 'admin' && (
            <NavLink
              to="/dev"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <Code2 size={18} />
              Developer OS
            </NavLink>
          )}

          {/* Trocar Ótica */}
          {availableProfiles.length > 1 && (
            <Dropdown
              trigger={
                <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                  <div className="h-5 w-5 rounded bg-primary-100 flex items-center justify-center text-primary-700">
                    <Building2 size={12} />
                  </div>
                  <span className="flex-1 text-left truncate">Trocar Ótica</span>
                  <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-400">
                    {availableProfiles.length}
                  </div>
                </button>
              }
            >
              <div className="p-1 min-w-[200px]">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Minhas Óticas</p>
                {availableProfiles.map(p => (
                  <DropdownItem 
                    key={p.company_id}
                    icon={<Building2 size={14} className={p.company_id === activeCompany?.id ? 'text-primary-600' : 'text-slate-400'} />}
                    onClick={() => {
                      setProfile(p)
                      setCompany(p.company || null)
                      onClose()
                      navigate('/')
                      // Refresh manual para garantir integridade
                      window.location.reload()
                    }}
                  >
                    <span className={cn(p.company_id === activeCompany?.id ? 'font-bold text-primary-900' : 'text-slate-700')}>
                      {p.company?.name}
                    </span>
                  </DropdownItem>
                ))}
              </div>
            </Dropdown>
          )}

          {/* Perfil */}
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <User size={18} />
            Meu Perfil
          </NavLink>

          {/* Suporte */}
          <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <HelpCircle size={18} />
            Suporte
          </button>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            {loading ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Botão hambúrguer para mobile ─────────────────────────────
export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}
