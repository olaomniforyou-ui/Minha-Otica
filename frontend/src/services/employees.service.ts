import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Profile, UserRole } from '@/types'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getEmployees() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  if (error) throw error
  return data as Profile[]
}

export async function updateEmployee(id: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function inviteEmployee(data: {
  email: string
  full_name: string
  role: UserRole
  phone?: string
}): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/users`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body:    JSON.stringify({ ...data, password: Math.random().toString(36).slice(-10) + 'A1!' }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? json.message ?? 'Erro ao convidar funcionário.')
}
