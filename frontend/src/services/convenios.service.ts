import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Convenio, ConvenioFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getConvenios(): Promise<Convenio[]> {
  const company_id = getCompanyId()

  if (navigator.onLine) {
    try {
      const { data } = await supabase
        .from('convenios')
        .select('*')
        .eq('company_id', company_id)
        .order('name', { ascending: true })

      if (data) {
        await db.convenios.bulkPut(data as Convenio[])
        return data as Convenio[]
      }
    } catch {}
  }

  return (await db.convenios.where('company_id').equals(company_id).toArray()) as Convenio[]
}

export async function createConvenio(formData: ConvenioFormData): Promise<Convenio> {
  const company_id = getCompanyId()
  const profile    = useAuthStore.getState().profile
  const now        = new Date().toISOString()

  const convenio: Convenio = {
    ...formData,
    id:         generateId(),
    company_id,
    created_by: profile?.id,
    created_at: now,
    updated_at: now,
  }

  await db.convenios.put(convenio)
  await enqueue('convenios', 'insert', convenio.id, convenio as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try { await supabase.from('convenios').insert(convenio) } catch {}
  }

  return convenio
}

export async function updateConvenio(id: string, patch: Partial<Convenio>): Promise<void> {
  const now  = new Date().toISOString()
  const full = { ...patch, updated_at: now }

  await db.convenios.update(id, full)
  await enqueue('convenios', 'update', id, full as Record<string, unknown>)

  if (navigator.onLine) {
    try { await supabase.from('convenios').update(full).eq('id', id) } catch {}
  }
}

export async function deleteConvenio(id: string): Promise<void> {
  await db.convenios.delete(id)
  await enqueue('convenios', 'delete', id, {})

  if (navigator.onLine) {
    try { await supabase.from('convenios').delete().eq('id', id) } catch {}
  }
}
