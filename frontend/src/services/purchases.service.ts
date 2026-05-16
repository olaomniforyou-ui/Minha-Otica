import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type {
  PurchaseOrder, PurchaseItem, PurchaseOrderFormData, PurchaseOrderStatus,
} from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const company_id = getCompanyId()

  if (navigator.onLine) {
    try {
      const { data } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(id,name), items:purchase_items(*)')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
      if (data) {
        await db.purchase_orders.bulkPut(data as PurchaseOrder[])
        return data as PurchaseOrder[]
      }
    } catch {}
  }

  const local = await db.purchase_orders
    .where('company_id').equals(company_id)
    .reverse()
    .sortBy('created_at')
  return local as PurchaseOrder[]
}

export async function createPurchaseOrder(formData: PurchaseOrderFormData): Promise<PurchaseOrder> {
  const company_id = getCompanyId()
  const profile    = useAuthStore.getState().profile
  const now        = new Date().toISOString()
  const orderId    = generateId()

  const total_amount = formData.items.reduce((s, i) => s + i.total_cost, 0)

  const order: PurchaseOrder = {
    id:                orderId,
    company_id,
    order_number:      `PC-${Date.now()}`,
    supplier_id:       formData.supplier_id,
    status:            'rascunho',
    total_amount,
    notes:             formData.notes,
    expected_delivery: formData.expected_delivery,
    created_by:        profile?.id,
    created_at:        now,
    updated_at:        now,
  }

  const items: PurchaseItem[] = formData.items.map(i => ({
    ...i,
    id:                generateId(),
    purchase_order_id: orderId,
  }))

  await db.purchase_orders.put(order)
  await db.purchase_items.bulkPut(items)

  await enqueue('purchase_orders', 'insert', order.id, order as unknown as Record<string, unknown>)
  for (const item of items) {
    await enqueue('purchase_items', 'insert', item.id, item as unknown as Record<string, unknown>)
  }

  if (navigator.onLine) {
    try {
      await supabase.from('purchase_orders').insert(order)
      await supabase.from('purchase_items').insert(items)
    } catch {}
  }

  return { ...order, items }
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
): Promise<void> {
  const now = new Date().toISOString()
  const patch = { status, updated_at: now, ...(status === 'recebido' ? { received_at: now } : {}) }

  await db.purchase_orders.update(id, patch)
  await enqueue('purchase_orders', 'update', id, patch)

  if (navigator.onLine) {
    try {
      await supabase.from('purchase_orders').update(patch).eq('id', id)
    } catch {}
  }
}

export async function receivePurchaseOrder(
  orderId: string,
  items: { id: string; quantity_received: number; unit_cost: number }[],
): Promise<void> {
  const company_id = getCompanyId()
  const profile    = useAuthStore.getState().profile
  const now        = new Date().toISOString()

  for (const item of items) {
    const patch = { quantity_received: item.quantity_received }
    await db.purchase_items.update(item.id, patch)
    await enqueue('purchase_items', 'update', item.id, patch)
  }

  const allItems = await db.purchase_items.where('purchase_order_id').equals(orderId).toArray()
  const allReceived = allItems.every(i => (i.quantity_received ?? 0) >= i.quantity)
  const anyReceived = allItems.some(i => (i.quantity_received ?? 0) > 0)

  const newStatus: PurchaseOrderStatus = allReceived ? 'recebido' : anyReceived ? 'parcial' : 'enviado'
  await updatePurchaseOrderStatus(orderId, newStatus)

  if (navigator.onLine) {
    try {
      for (const item of items) {
        if (item.quantity_received <= 0) continue

        const { data: product } = await supabase
          .from('purchase_items')
          .select('product_id, quantity')
          .eq('id', item.id)
          .single()

        if (!product?.product_id) continue

        const { data: prod } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', product.product_id)
          .single()

        const prev = prod?.stock_quantity ?? 0
        const next = prev + item.quantity_received

        await supabase.from('products').update({ stock_quantity: next }).eq('id', product.product_id)
        await supabase.from('stock_movements').insert({
          id:           generateId(),
          company_id,
          product_id:   product.product_id,
          type:         'entrada',
          quantity:     item.quantity_received,
          previous_qty: prev,
          new_qty:      next,
          unit_cost:    item.unit_cost,
          reason:       'Recebimento de compra',
          reference_id: orderId,
          reference_type: 'purchase_order',
          created_by:   profile?.id,
          created_at:   now,
        })
      }

      for (const item of items) {
        await supabase
          .from('purchase_items')
          .update({ quantity_received: item.quantity_received })
          .eq('id', item.id)
      }
    } catch {}
  }
}
