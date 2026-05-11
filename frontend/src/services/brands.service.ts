import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Brand, BrandFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getBrands(): Promise<Brand[]> {
  return db.brands.toArray() as Promise<Brand[]>
}

export async function createBrand(data: BrandFormData): Promise<Brand> {
  const company_id = getCompanyId()
  const now = new Date().toISOString()
  const brand: Brand = {
    id: generateId(),
    company_id,
    ...data,
    created_at: now,
    updated_at: now,
  }
  await db.brands.add({ ...brand, _pending_sync: true })
  await enqueue('brands', 'insert', brand.id, brand as unknown as Record<string, unknown>)
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('brands').insert(brand)
      if (!error) {
        await db.brands.update(brand.id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(brand.id).delete()
      }
    } catch {}
  }
  return brand
}

export async function updateBrand(id: string, data: Partial<BrandFormData>): Promise<void> {
  const now = new Date().toISOString()
  const updates = { ...data, updated_at: now }
  await db.brands.update(id, { ...updates, _pending_sync: true })
  await enqueue('brands', 'update', id, updates as Record<string, unknown>)
  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('brands').update(updates).eq('id', id)
      if (!error) {
        await db.brands.update(id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(id).delete()
      }
    } catch {}
  }
}

export async function deleteBrand(id: string): Promise<void> {
  await db.brands.delete(id)
  await enqueue('brands', 'delete', id, {})
  if (navigator.onLine) {
    try { await supabase.from('brands').delete().eq('id', id) } catch {}
  }
}
