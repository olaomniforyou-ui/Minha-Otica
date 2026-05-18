import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from './useSubscription'

export interface PlanLimits {
  maxPatients: number | null
  patientCount: number
  patientPct: number
  patientNearLimit: boolean
  patientAtLimit: boolean
  loading: boolean
}

export function usePlanLimits(): PlanLimits {
  const company = useAuthStore(s => s.company)
  const { subscription, loading: subLoading } = useSubscription()
  const [patientCount, setPatientCount] = useState(0)
  const [countLoading, setCountLoading] = useState(true)

  useEffect(() => {
    if (!company) { setCountLoading(false); return }
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('is_active', true)
      .then(({ count }) => {
        setPatientCount(count ?? 0)
        setCountLoading(false)
      })
  }, [company?.id])

  const maxPatients = subscription?.plan?.max_patients ?? null
  const patientPct  = maxPatients ? Math.round((patientCount / maxPatients) * 100) : 0

  return {
    maxPatients,
    patientCount,
    patientPct,
    patientNearLimit: maxPatients !== null && patientPct >= 80,
    patientAtLimit:   maxPatients !== null && patientCount >= maxPatients,
    loading: subLoading || countLoading,
  }
}
