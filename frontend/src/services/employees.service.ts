import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

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
  // In Supabase, deleting a profile usually means deleting the Auth user.
  // But we can just set is_active = false if we don't have admin privileges.
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}
