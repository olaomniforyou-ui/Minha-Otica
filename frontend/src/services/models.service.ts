import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Model, ModelFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getModels(brandId?: string): Promise<Model[]> {
  if (brandId) {
    return db.models.where('brand_id').equals(brandId).toArray() as Promise<Model[]>
  }
  return db.models.toArray() as Promise<Model[]>
}

export async function createModel(data: ModelFormData): Promise<Model> {
  const company_id = getCompanyId()
  const now = new Date().toISOString()
  const model: Model = {
    id: generateId(),
    company_id,
    ...data,
    created_at: now,
    updated_at: now,
  }
  await db.models.add({ ...model, _pending_sync: true })
  await enqueue('models', 'insert', model.id, model as unknown as Record<string, unknown>)
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('models').insert(model)
      if (!error) {
        await db.models.update(model.id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(model.id).delete()
      }
    } catch {}
  }
  return model
}

export async function updateModel(id: string, data: Partial<ModelFormData>): Promise<void> {
  const now = new Date().toISOString()
  const updates = { ...data, updated_at: now }
  await db.models.update(id, { ...updates, _pending_sync: true })
  await enqueue('models', 'update', id, updates as Record<string, unknown>)
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('models').update(updates).eq('id', id)
      if (!error) {
        await db.models.update(id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(id).delete()
      }
    } catch {}
  }
}

export async function deleteModel(id: string): Promise<void> {
  await db.models.delete(id)
  await enqueue('models', 'delete', id, {})
  if (navigator.onLine) {
    try { await supabase.from('models').delete().eq('id', id) } catch {}
  }
}
