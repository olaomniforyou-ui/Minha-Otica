import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Subscription } from '@/types'

interface SubscriptionInfo {
  subscription: Subscription | null
  loading: boolean
  daysLeft: number | null
  isTrialing: boolean
  isSuspended: boolean
}

export function useSubscription(): SubscriptionInfo {
  const company = useAuthStore(s => s.company)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!company) { setLoading(false); return }

    supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('company_id', company.id)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription(data as Subscription | null)
        setLoading(false)
      })
  }, [company?.id])

  const isTrialing  = subscription?.status === 'trial'
  const isSuspended = subscription?.status === 'suspended' || subscription?.status === 'cancelled'

  let daysLeft: number | null = null
  if (isTrialing && subscription?.trial_ends_at) {
    const diff = new Date(subscription.trial_ends_at).getTime() - Date.now()
    daysLeft = Math.max(0, Math.ceil(diff / 86_400_000))
  } else if (subscription?.current_period_end) {
    const diff = new Date(subscription.current_period_end).getTime() - Date.now()
    daysLeft = Math.max(0, Math.ceil(diff / 86_400_000))
  }

  return { subscription, loading, daysLeft, isTrialing, isSuspended }
}
