import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Product, ProductFormData, ProductCategory } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

// Enriquece produtos com a categoria do Dexie local
async function enrichWithCategories(products: Product[]): Promise<Product[]> {
  const cats = await db.product_categories.toArray()
  const catMap = new Map(cats.map(c => [c.id, c as ProductCategory]))
  return products.map(p => ({
    ...p,
    category: p.category_id ? catMap.get(p.category_id) : undefined,
  }))
}

export async function getProducts(search?: string): Promise<Product[]> {
  const company = useAuthStore.getState().company
  if (!company) return []

  // Fallback: se Dexie estiver vazia para esta empresa, busca no Supabase
  const count = await db.products.where('company_id').equals(company.id).count()
  if (count === 0 && navigator.onLine) {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', company.id)
      if (data?.length) {
        await db.products.bulkPut(data.map((p: any) => ({ ...p, _pending_sync: false })))
      }
    } catch {}
  }

  let products: Product[]
  if (search) {
    const term = search.toLowerCase()
    products = await db.products
      .filter(p =>
        !!p.is_active &&
        (p.name.toLowerCase().includes(term) ||
          (p.brand ?? '').toLowerCase().includes(term) ||
          (p.sku ?? '').toLowerCase().includes(term)),
      )
      .toArray() as Product[]
  } else {
    products = await db.products.filter(p => !!p.is_active).toArray() as Product[]
  }

  return enrichWithCategories(products)
}

export async function getLowStockProducts(): Promise<Product[]> {
  const products = await db.products
    .filter(p => !!p.is_active && p.stock_quantity <= p.min_stock_quantity)
    .toArray() as Product[]
  return enrichWithCategories(products)
}

export async function getCategories(): Promise<ProductCategory[]> {
  return db.product_categories.toArray() as Promise<ProductCategory[]>
}

export async function createProduct(data: ProductFormData): Promise<Product> {
  const company_id = getCompanyId()
  const now = new Date().toISOString()

  const product: Product = {
    ...data,
    id: generateId(),
    company_id,
    is_active: data.is_active ?? true,
    created_at: now,
    updated_at: now,
  }

  await db.products.add({ ...product, _pending_sync: true } as any)
  await enqueue('products', 'insert', product.id, product as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      // Envia apenas os campos escalares (sem relações)
      const row = {
        id:                 product.id,
        company_id:         product.company_id,
        category_id:        product.category_id,
        supplier_id:        product.supplier_id,
        brand_id:           product.brand_id,
        model_id:           product.model_id,
        name:               product.name,
        sku:                product.sku || null,
        barcode:            product.barcode || null,
        description:        product.description,
        color:              product.color,
        size:               product.size,
        sale_price:         product.sale_price,
        cost_price:         product.cost_price,
        stock_quantity:     product.stock_quantity,
        min_stock_quantity: product.min_stock_quantity,
        image_url:          product.image_url || null,
        is_active:          product.is_active,
        created_at:         product.created_at,
        updated_at:         product.updated_at,
      }
      const { error } = await supabase.from('products').insert(row)
      if (!error) {
        await db.products.update(product.id, { _pending_sync: false } as any)
        await db.sync_queue.where('record_id').equals(product.id).delete()
      }
    } catch {}
  }

  return product
}

export async function updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product> {
  const now = new Date().toISOString()
  const updates = {
    ...data,
    sku:      data.sku      !== undefined ? (data.sku      || null) : undefined,
    barcode:  data.barcode  !== undefined ? (data.barcode  || null) : undefined,
    updated_at: now,
  }

  await db.products.update(id, { ...updates, _pending_sync: true } as any)
  await enqueue('products', 'update', id, updates as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('products').update(updates).eq('id', id)
      if (!error) {
        await db.products.update(id, { _pending_sync: false } as any)
        await db.sync_queue.where('record_id').equals(id).delete()
      }
    } catch {}
  }

  const updated = await db.products.get(id)
  return updated as Product
}

export async function updateStock(id: string, quantity: number): Promise<void> {
  await updateProduct(id, { stock_quantity: quantity } as Partial<ProductFormData>)
}
