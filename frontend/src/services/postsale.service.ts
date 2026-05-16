import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { PostSale, PostSaleFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getPatientPostSales(patientId: string): Promise<PostSale[]> {
  const company_id = getCompanyId()

  if (navigator.onLine) {
    try {
      const { data } = await supabase
        .from('post_sales')
        .select('*')
        .eq('patient_id', patientId)
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
      if (data) return data as PostSale[]
    } catch {}
  }

  return []
}

export async function createPostSale(data: PostSaleFormData): Promise<PostSale> {
  const company_id = getCompanyId()
  const profile    = useAuthStore.getState().profile
  const now        = new Date().toISOString()

  const record: PostSale = {
    ...data,
    id:         generateId(),
    company_id,
    created_by: profile?.id,
    created_at: now,
  }

  await enqueue('post_sales', 'insert', record.id, record as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      await supabase.from('post_sales').insert(record)
    } catch {}
  }

  return record
}

export async function resolvePostSale(id: string): Promise<void> {
  await enqueue('post_sales', 'update', id, { resolved: true })

  if (navigator.onLine) {
    try {
      await supabase.from('post_sales').update({ resolved: true }).eq('id', id)
    } catch {}
  }
}
