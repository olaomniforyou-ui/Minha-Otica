import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { moveStock } from '@/services/stock.service'
import { createPrescription } from '@/services/prescriptions.service'
import type { Sale, SaleItem, SaleFormData } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getSales(): Promise<Sale[]> {
  const sales = await db.sales.toArray()
  const sorted = sales.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  // Enriquece com paciente e itens
  return Promise.all(
    sorted.map(async (s) => {
      const [patient, items] = await Promise.all([
        s.patient_id ? db.patients.get(s.patient_id) : Promise.resolve(undefined),
        db.sale_items.where('sale_id').equals(s.id).toArray(),
      ])
      return { ...s, patient, items } as Sale
    }),
  )
}

export async function getTodayStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const all = await db.sales.toArray()
  const todaySales = all.filter((s) => new Date(s.created_at) >= today)
  const total = todaySales.reduce((sum, s) => sum + s.total_amount, 0)
  return {
    count: todaySales.length,
    total,
    avg: todaySales.length > 0 ? total / todaySales.length : 0,
  }
}

export async function createSale(data: SaleFormData): Promise<Sale> {
  const company_id = getCompanyId()
  const profile    = useAuthStore.getState().profile
  const now        = new Date().toISOString()

  // Cria receita inline se for óculos de grau e tiver dados de receita
  let prescription_id: string | undefined
  if (data.sale_type === 'oculos_grau' && data.prescription && data.patient_id) {
    const presc = await createPrescription({ ...data.prescription, patient_id: data.patient_id })
    prescription_id = presc.id
  }

  // Número da venda
  let sale_number = `VND-LOCAL-${Date.now()}`
  if (navigator.onLine) {
    const { data: num } = await supabase.rpc('next_sale_number', { p_company_id: company_id })
    if (num) sale_number = num
  }

  const sale: Sale = {
    id:               generateId(),
    company_id,
    sale_number,
    patient_id:       data.patient_id || undefined,
    seller_id:        data.seller_id || undefined,
    customer_name:    data.customer_name || undefined,
    sale_type:        data.sale_type || undefined,
    prescription_id,
    service_order_id: data.service_order_id || undefined,
    total_amount:     data.total_amount,
    discount_amount:  data.discount_amount,
    paid_amount:      data.paid_amount,
    payment_method:   data.payment_method,
    payments:         data.payments,
    notes:            data.notes || undefined,
    created_by:       profile?.id,
    created_at:       now,
    updated_at:       now,
  }

  // Salva venda
  await db.sales.add({ ...sale, _pending_sync: true })
  await enqueue('sales', 'insert', sale.id, sale as unknown as Record<string, unknown>)

  // Salva itens e baixa estoque
  const saleItems: SaleItem[] = data.items.map((item) => ({
    id:          generateId(),
    sale_id:     sale.id,
    product_id:  item.product_id || undefined,
    description: item.description,
    quantity:    item.quantity,
    unit_price:  item.unit_price,
    discount:    item.discount,
    total_price: item.total_price,
  }))

  for (const item of saleItems) {
    await db.sale_items.add(item)
    await enqueue('sale_items', 'insert', item.id, item as unknown as Record<string, unknown>)
    // Baixa de estoque para cada produto (falha silenciosa — venda nunca deve ser bloqueada por estoque)
    if (item.product_id) {
      try {
        await moveStock({
          product_id: item.product_id,
          type:       'saida',
          quantity:   item.quantity,
          reason:     `Venda ${sale_number}`,
        })
      } catch {}
    }
  }

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('sales').insert(sale)
      if (!error) {
        await supabase.from('sale_items').insert(saleItems)
        await db.sales.update(sale.id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(sale.id).delete()
      }
    } catch {}
  }

  return { ...sale, items: saleItems }
}

export async function updateSale(id: string, data: SaleFormData): Promise<Sale> {
  const now = new Date().toISOString()

  const saleUpdate: Partial<Sale> = {
    patient_id:     data.patient_id || undefined,
    seller_id:      data.seller_id || undefined,
    customer_name:  data.customer_name || undefined,
    sale_type:      data.sale_type || undefined,
    total_amount:   data.total_amount,
    discount_amount: data.discount_amount,
    paid_amount:    data.paid_amount,
    payment_method: data.payment_method,
    notes:          data.notes || undefined,
    updated_at:     now,
  }

  await db.sales.update(id, { ...saleUpdate, _pending_sync: true })
  await enqueue('sales', 'update', id, saleUpdate as unknown as Record<string, unknown>)

  // Para simplicidade no MVP, vamos substituir os itens
  await db.sale_items.where('sale_id').equals(id).delete()
  const saleItems: SaleItem[] = data.items.map((item) => ({
    id:          generateId(),
    sale_id:     id,
    product_id:  item.product_id || undefined,
    description: item.description,
    quantity:    item.quantity,
    unit_price:  item.unit_price,
    discount:    item.discount,
    total_price: item.total_price,
  }))

  for (const item of saleItems) {
    await db.sale_items.add(item)
    await enqueue('sale_items', 'insert', item.id, item as unknown as Record<string, unknown>)
  }

  if (navigator.onLine) {
    try {
      await supabase.from('sales').update(saleUpdate).eq('id', id)
      // Substituir itens no Supabase
      await supabase.from('sale_items').delete().eq('sale_id', id)
      await supabase.from('sale_items').insert(saleItems)
      await db.sales.update(id, { _pending_sync: false })
    } catch {}
  }

  const updated = await db.sales.get(id)
  return { ...updated, items: saleItems } as Sale
}

export async function deleteSale(id: string): Promise<void> {
  await db.sales.delete(id)
  await db.sale_items.where('sale_id').equals(id).delete()
  await enqueue('sales', 'delete', id, {})

  if (navigator.onLine) {
    try {
      await supabase.from('sales').delete().eq('id', id)
    } catch {}
  }
}
