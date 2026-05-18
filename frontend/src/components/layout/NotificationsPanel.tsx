import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, X, CheckCheck, Package, FlaskConical,
  ClipboardList, Star, Clock, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications, type AppNotification, type NotifType } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TYPE_META: Record<NotifType, { icon: React.ComponentType<any>; color: string }> = {
  low_stock:       { icon: Package,       color: 'text-amber-500 bg-amber-50'   },
  lab_defect:      { icon: FlaskConical,  color: 'text-red-500 bg-red-50'       },
  os_pending:      { icon: ClipboardList, color: 'text-indigo-500 bg-indigo-50' },
  postsale_pending:{ icon: Star,          color: 'text-violet-500 bg-violet-50' },
  trial:           { icon: Clock,         color: 'text-orange-500 bg-orange-50' },
  info:            { icon: Info,          color: 'text-slate-500 bg-slate-100'  },
}

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll, requestPermission, notifPermission } = useNotifications()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  if (!open) return null

  function handleNotifClick(n: AppNotification) {
    markRead(n.id)
    if (n.href) {
      navigate(n.href)
      onClose()
    }
  }

  function timeAgo(iso: string) {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR })
    } catch {
      return ''
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
      style={{ maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-slate-600" />
          <span className="text-sm font-bold text-slate-800">Notificações</span>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              title="Marcar todas como lidas"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <CheckCheck size={12} /> Todas lidas
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Banner de permissão */}
      {notifPermission !== 'granted' && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
          <Bell size={13} className="text-indigo-500 flex-shrink-0" />
          <p className="text-[11px] text-indigo-700 flex-1">
            {notifPermission === 'denied'
              ? 'Notificações bloqueadas pelo navegador.'
              : 'Ative alertas em tempo real no navegador.'}
          </p>
          {notifPermission !== 'denied' && (
            <button
              onClick={requestPermission}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
            >
              Ativar →
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Bell size={32} className="mb-3 opacity-20" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          notifications.map(n => {
            const meta = TYPE_META[n.type] ?? TYPE_META.info
            const Icon = meta.icon
            return (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50',
                  !n.read && 'bg-indigo-50/40',
                )}
              >
                <div className={cn('flex-shrink-0 rounded-xl p-2 mt-0.5', meta.color.split(' ')[1])}>
                  <Icon size={14} className={meta.color.split(' ')[0]} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold text-slate-800', !n.read && 'font-bold')}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                    className="text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {notifications.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2.5 text-center">
          <button
            onClick={clearAll}
            className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
          >
            Limpar todas
          </button>
        </div>
      )}
    </div>
  )
}

// Botão do sino com badge — exportado separadamente para o Header
export function NotificationsBell() {
  return null // usado apenas para tipo
}
