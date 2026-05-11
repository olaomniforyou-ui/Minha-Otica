import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Supplier, SupplierFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getSuppliers(search?: string): Promise<Supplier[]> {
  const company = useAuthStore.getState().company
  if (!company) return []

  // Fallback: se Dexie estiver vazia, busca no Supabase
  const count = await db.suppliers.where('company_id').equals(company.id).count()
  if (count === 0 && navigator.onLine) {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', company.id)
      if (data?.length) {
        await db.suppliers.bulkPut(data.map((s: any) => ({ ...s, _pending_sync: false })))
      }
    } catch {}
  }

  const all = await db.suppliers
    .filter(s => !!s.is_active && s.company_id === company.id)
    .toArray()

  if (!search) return all
  const term = search.toLowerCase()
  return all.filter(
    s =>
      s.name.toLowerCase().includes(term) ||
      (s.cnpj ?? '').includes(term) ||
      (s.contact_name ?? '').toLowerCase().includes(term),
  )
}

export async function getSupplierById(id: string): Promise<Supplier | undefined> {
  return db.suppliers.get(id) as Promise<Supplier | undefined>
}

export async function createSupplier(data: SupplierFormData): Promise<Supplier> {
  const company_id = getCompanyId()
  const now = new Date().toISOString()

  const supplier: Supplier = {
    ...data,
    id: generateId(),
    company_id,
    is_active: true,
    created_at: now,
    updated_at: now,
  }

  await db.suppliers.add({ ...supplier, _pending_sync: true })
  await enqueue('suppliers', 'insert', supplier.id, supplier as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('suppliers').insert(supplier)
      if (!error) {
        await db.suppliers.update(supplier.id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(supplier.id).delete()
      }
    } catch {}
  }

  return supplier
}

export async function updateSupplier(id: string, data: Partial<SupplierFormData>): Promise<Supplier> {
  const now = new Date().toISOString()
  const updates = { ...data, updated_at: now }

  await db.suppliers.update(id, { ...updates, _pending_sync: true })
  await enqueue('suppliers', 'update', id, updates as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('suppliers').update(updates).eq('id', id)
      if (!error) {
        await db.suppliers.update(id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(id).delete()
      }
    } catch {}
  }

  return db.suppliers.get(id) as Promise<Supplier>
}

export async function deleteSupplier(id: string): Promise<void> {
  await updateSupplier(id, { is_active: false })
}
