import { supabase } from '@/lib/supabase'
import type {
  Plan, PlanFormData, SaasStats, SaasAdmin,
  CompanyWithSubscription, Subscription, SubscriptionHistory,
} from '@/types'

export async function getCurrentAdmin(): Promise<SaasAdmin | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('saas_admins')
    .select('*')
    .eq('id', user.id)
    .single()

  return data as SaasAdmin | null
}

// ── STATS ─────────────────────────────────────────────────────
export async function getSaasStats(): Promise<SaasStats> {
  const { data, error } = await supabase.rpc('get_saas_stats')
  if (error) throw error
  return data as SaasStats
}

// Mock stats for when the DB function isn't set up yet
export async function getSaasStatsSafe(): Promise<SaasStats> {
  try {
    return await getSaasStats()
  } catch {
    // Return mock data if function not available yet
    return {
      total_companies: 0,
      active_companies: 0,
      trial_companies: 0,
      suspended_companies: 0,
      total_users: 0,
      mrr: 0,
      arr: 0,
      new_companies_30d: 0,
      trials_expiring_7d: 0,
    }
  }
}

// ── COMPANIES ────────────────────────────────────────────────
export async function listAllCompanies(): Promise<CompanyWithSubscription[]> {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      subscription:subscriptions(
        *,
        plan:plans(*)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get user counts
  const companies = (data || []) as CompanyWithSubscription[]
  return companies.map((c: any) => ({
    ...c,
    subscription: Array.isArray(c.subscription) ? c.subscription[0] : c.subscription,
  }))
}

export async function getCompanyDetail(companyId: string) {
  const [companyRes, usersRes, patientsRes, subscriptionRes, historyRes] = await Promise.all([
    supabase.from('companies').select('*').eq('id', companyId).single(),
    supabase.from('profiles').select('*').eq('company_id', companyId),
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('subscriptions').select('*, plan:plans(*)').eq('company_id', companyId).single(),
    supabase.from('subscription_history').select('*, plan:plans(name,slug)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
  ])

  return {
    company: companyRes.data,
    users: usersRes.data || [],
    patientCount: patientsRes.count || 0,
    subscription: subscriptionRes.data,
    history: historyRes.data || [],
  }
}

export async function toggleCompanyStatus(companyId: string, isActive: boolean) {
  const { error } = await supabase
    .from('companies')
    .update({ is_active: isActive })
    .eq('id', companyId)
  if (error) throw error
}

// ── SUBSCRIPTIONS ────────────────────────────────────────────
export async function updateSubscription(
  companyId: string,
  planId: string,
  status: string,
  billingCycle: string,
  amount: number,
  notes?: string
) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('company_id', companyId)
    .single()

  const payload: Partial<Subscription> = {
    company_id: companyId,
    plan_id: planId,
    status: status as any,
    billing_cycle: billingCycle as any,
    amount,
    notes,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }

  let error
  if (existing) {
    ({ error } = await supabase.from('subscriptions').update(payload).eq('company_id', companyId))
  } else {
    ({ error } = await supabase.from('subscriptions').insert(payload))
  }

  if (error) throw error

  // Record in history
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('subscription_history').insert({
    company_id: companyId,
    plan_id: planId,
    status,
    amount,
    changed_by: user?.id,
    notes,
  })
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*), company:companies(name, cnpj)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Subscription[]
}

// ── PLANS ─────────────────────────────────────────────────────
export async function listPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data || []) as Plan[]
}

export async function upsertPlan(plan: PlanFormData, id?: string) {
  if (id) {
    const { error } = await supabase.from('plans').update(plan).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('plans').insert(plan)
    if (error) throw error
  }
}

export async function deletePlan(id: string) {
  const { error } = await supabase.from('plans').delete().eq('id', id)
  if (error) throw error
}

// ── USERS ─────────────────────────────────────────────────────
export async function listAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, company:companies(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) throw error
}

export async function updateAdminProfile(adminId: string, data: Partial<SaasAdmin>) {
  const { error } = await supabase
    .from('saas_admins')
    .update(data)
    .eq('id', adminId)

  if (error) throw error

  const { data: updated } = await supabase
    .from('saas_admins')
    .select('*')
    .eq('id', adminId)
    .single()

  return updated as SaasAdmin
}

