import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId, slugify } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { ProductCategory, CategoryFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getCategories(): Promise<ProductCategory[]> {
  return db.product_categories.toArray() as Promise<ProductCategory[]>
}

export async function createCategory(data: CategoryFormData): Promise<ProductCategory> {
  const company_id = getCompanyId()
  const now = new Date().toISOString()

  const category: ProductCategory = {
    ...data,
    id: generateId(),
    company_id,
    slug: data.slug || slugify(data.name),
    created_at: now,
  }

  await db.product_categories.add(category)
  await enqueue('product_categories', 'insert', category.id, category as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('product_categories').insert(category)
      if (!error) await db.sync_queue.where('record_id').equals(category.id).delete()
    } catch {}
  }

  return category
}

export async function updateCategory(id: string, data: Partial<CategoryFormData>): Promise<ProductCategory> {
  const updates = { ...data, slug: data.name ? slugify(data.name) : data.slug }
  await db.product_categories.update(id, updates)
  await enqueue('product_categories', 'update', id, updates as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('product_categories').update(updates).eq('id', id)
      if (!error) await db.sync_queue.where('record_id').equals(id).delete()
    } catch {}
  }

  return db.product_categories.get(id) as Promise<ProductCategory>
}

export async function deleteCategory(id: string): Promise<void> {
  await db.product_categories.delete(id)
  await enqueue('product_categories', 'delete', id, {})

  if (navigator.onLine) {
    try {
      await supabase.from('product_categories').delete().eq('id', id)
      await db.sync_queue.where('record_id').equals(id).delete()
    } catch {}
  }
}
