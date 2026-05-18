import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { useAuthStore } from '@/store/authStore'
import type { LabTracking, LabStatus } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getLabTrackings(): Promise<LabTracking[]> {
  const company_id = getCompanyId()

  if (navigator.onLine) {
    try {
      const { data } = await supabase
        .from('lab_trackings')
        .select('*, service_order:service_orders!service_order_id(id, order_number, patient:patients!patient_id(full_name, phone, whatsapp))')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })

      if (data) {
        await db.lab_trackings.bulkPut(data as LabTracking[])
        return data as LabTracking[]
      }
    } catch {}
  }

  const local = await db.lab_trackings
    .where('company_id').equals(company_id)
    .toArray()

  return local.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) as LabTracking[]
}

export async function updateLabStatus(id: string, status: LabStatus, notes?: string): Promise<void> {
  const now  = new Date().toISOString()
  const patch: Partial<LabTracking> = {
    status,
    updated_at: now,
    ...(notes !== undefined ? { notes } : {}),
    ...(status === 'enviado' ? { sent_at: now } : {}),
    ...(status === 'retornado' ? { returned_at: now } : {}),
  }

  await db.lab_trackings.update(id, patch)
  await enqueue('lab_trackings', 'update', id, patch as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      await supabase.from('lab_trackings').update(patch).eq('id', id)
    } catch {}
  }
}
