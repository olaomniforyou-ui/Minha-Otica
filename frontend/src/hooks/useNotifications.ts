import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export type NotifType = 'low_stock' | 'lab_defect' | 'os_pending' | 'postsale_pending' | 'trial' | 'info'

export interface AppNotification {
  id: string
  type: NotifType
  title: string
  body: string
  href?: string
  createdAt: string
  read: boolean
}

const STORAGE_KEY = 'app_notifications_v1'
const MAX_NOTIFS = 30

function load(): AppNotification[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function save(n: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(n.slice(0, MAX_NOTIFS)))
}

function upsert(list: AppNotification[], incoming: AppNotification[]): AppNotification[] {
  const map = new Map(list.map(n => [n.id, n]))
  incoming.forEach(n => { if (!map.has(n.id)) map.set(n.id, n) })
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function useNotifications() {
  const company = useAuthStore(s => s.company)
  const { isTrialing, daysLeft } = useTrialInfo()
  const [notifications, setNotifications] = useState<AppNotification[]>(load)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const shownRef = useRef<Set<string>>(new Set())

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n)
      save(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      save(next)
      return next
    })
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id)
      save(next)
      return next
    })
  }, [])

  // Gera notificações com base nos dados reais
  const refresh = useCallback(async () => {
    if (!company) return
    const fresh: AppNotification[] = []
    const now = new Date().toISOString()

    try {
      // Estoque baixo
      const { data: lowStock } = await supabase
        .from('products')
        .select('id, name')
        .eq('company_id', company.id)
        .filter('stock_quantity', 'lte', 'min_stock')
        .limit(5)

      if (lowStock && lowStock.length > 0) {
        fresh.push({
          id: `low_stock_${new Date().toDateString()}`,
          type: 'low_stock',
          title: 'Estoque baixo',
          body: `${lowStock.length} produto${lowStock.length > 1 ? 's' : ''} abaixo do mínimo: ${lowStock.map(p => p.name).join(', ')}`,
          href: '/products',
          createdAt: now,
          read: false,
        })
      }

      // Defeitos no laboratório
      const { data: defects } = await supabase
        .from('lab_trackings')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'com_defeito')

      if (defects && defects.length > 0) {
        fresh.push({
          id: `lab_defect_${new Date().toDateString()}`,
          type: 'lab_defect',
          title: 'Defeitos no laboratório',
          body: `${defects.length} pedido${defects.length > 1 ? 's' : ''} com defeito aguardando resolução.`,
          href: '/lab',
          createdAt: now,
          read: false,
        })
      }

      // OS pendentes antigas (> 5 dias)
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
      const { data: oldOs } = await supabase
        .from('service_orders')
        .select('id')
        .eq('company_id', company.id)
        .not('status', 'in', '("entregue","cancelado")')
        .lte('created_at', fiveDaysAgo.toISOString())

      if (oldOs && oldOs.length > 0) {
        fresh.push({
          id: `os_pending_${new Date().toDateString()}`,
          type: 'os_pending',
          title: 'OS pendentes há mais de 5 dias',
          body: `${oldOs.length} ordem${oldOs.length > 1 ? 'ns' : ''} de serviço sem atualização há mais de 5 dias.`,
          href: '/orders',
          createdAt: now,
          read: false,
        })
      }

      // Pós-venda pendente
      const { data: psales } = await supabase
        .from('post_sales')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'pending')

      if (psales && psales.length > 0) {
        fresh.push({
          id: `postsale_${new Date().toDateString()}`,
          type: 'postsale_pending',
          title: 'Pós-vendas pendentes',
          body: `${psales.length} registro${psales.length > 1 ? 's' : ''} de pós-venda aguardando resolução.`,
          href: '/post-sales',
          createdAt: now,
          read: false,
        })
      }
    } catch { /* ignora erros de rede */ }

    // Trial expirando
    if (isTrialing && daysLeft !== null && daysLeft <= 3) {
      fresh.push({
        id: `trial_${daysLeft}`,
        type: 'trial',
        title: 'Trial expirando',
        body: daysLeft <= 0
          ? 'Seu período de trial expirou hoje. Assine um plano para continuar.'
          : `Seu trial expira em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}. Assine agora.`,
        href: '/pricing',
        createdAt: now,
        read: false,
      })
    }

    if (fresh.length > 0) {
      setNotifications(prev => {
        const merged = upsert(prev, fresh)
        save(merged)
        return merged
      })
    }
  }, [company, isTrialing, daysLeft])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5 * 60 * 1000) // a cada 5 min
    return () => clearInterval(id)
  }, [refresh])

  const clearAll = useCallback(() => {
    save([])
    setNotifications([])
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    return result
  }, [])

  // Dispara notificação nativa no browser para novas não lidas
  useEffect(() => {
    if (notifPermission !== 'granted') return
    const unread = notifications.filter(n => !n.read)
    const newOnes = unread.filter(n => !shownRef.current.has(n.id))
    newOnes.forEach(n => {
      try {
        new Notification(n.title, { body: n.body, icon: '/icons/icon-192.png', tag: n.id })
      } catch { /* browser pode bloquear em dev */ }
      shownRef.current.add(n.id)
    })
  }, [notifications, notifPermission])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll, refresh, requestPermission, notifPermission }
}

// Hook auxiliar para trial info
function useTrialInfo() {
  const company = useAuthStore(s => s.company)
  const [isTrialing, setIsTrialing] = useState(false)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!company) return
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('company_id', company.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setIsTrialing(data.status === 'trialing')
        if (data.trial_ends_at) {
          const diff = Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / 86400000)
          setDaysLeft(diff)
        }
      })
  }, [company])

  return { isTrialing, daysLeft }
}
