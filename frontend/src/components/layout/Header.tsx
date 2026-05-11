import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import {
  Bell, RefreshCw, Wifi, WifiOff, CheckCircle,
  AlertCircle, Loader2, Clock,
} from 'lucide-react'
import { cn, formatDateTime, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useSync } from '@/hooks/useSync'
import { useOnline } from '@/hooks/useOnline'
import { SidebarToggle } from './Sidebar'

interface HeaderProps {
  onMenuClick: () => void
  title?: string
  subtitle?: string
}

export function Header({ onMenuClick, title, subtitle }: HeaderProps) {
  const profile  = useAuthStore((s) => s.profile)
  const isOnline = useOnline()
  const { isSyncing, lastSyncedAt, pendingCount, error, sync } = useSync()

  const today = format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })
  const initials = profile ? getInitials(profile.full_name) : '?'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-100 bg-white px-4 sm:px-6">
      {/* Hambúrguer mobile */}
      <SidebarToggle onClick={onMenuClick} />

      {/* Título da página */}
      {title && (
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Data */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 md:flex">
          <Clock size={14} className="text-slate-400" />
          {today}
        </div>

        {/* Status de conexão */}
        <div
          className={cn(
            'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex',
            isOnline
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700',
          )}
        >
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Botão de sync */}
        <button
          onClick={sync}
          disabled={isSyncing}
          title={
            error
              ? `Erro: ${error}`
              : lastSyncedAt
              ? `Último sync: ${formatDateTime(lastSyncedAt)}`
              : 'Sincronizar agora'
          }
          className={cn(
            'relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            error
              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              : pendingCount > 0
              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          {isSyncing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : error ? (
            <AlertCircle size={14} />
          ) : pendingCount > 0 ? (
            <RefreshCw size={14} />
          ) : (
            <CheckCircle size={14} />
          )}
          <span className="hidden sm:inline">
            {isSyncing
              ? 'Sincronizando...'
              : pendingCount > 0
              ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`
              : 'Sincronizado'}
          </span>
        </button>

        {/* Notificações */}
        <button className="relative rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 transition-colors">
          <Bell size={18} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* Avatar */}
        <Link 
          to="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-800 text-sm font-bold text-white select-none overflow-hidden transition-transform hover:scale-105 active:scale-95"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </Link>
      </div>
    </header>
  )
}
