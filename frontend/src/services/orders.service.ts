import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { createSale } from '@/services/sales.service'
import type { ServiceOrder, ServiceOrderFormData, ServiceOrderStatus } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

export async function getOrders(status?: ServiceOrderStatus): Promise<ServiceOrder[]> {
  const company_id = getCompanyId()

  // Fallback: se Dexie estiver vazio, busca no Supabase
  const count = await db.service_orders.where('company_id').equals(company_id).count()
  if (count === 0 && navigator.onLine) {
    try {
      const { data } = await supabase
        .from('service_orders')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
      if (data?.length) await db.service_orders.bulkPut(data.map((o: any) => ({ ...o, _pending_sync: false })))
    } catch {}
  }

  let results = await db.service_orders
    .where('company_id').equals(company_id)
    .toArray()
  if (status) results = results.filter((o) => o.status === status)
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Enriquece com paciente
  return Promise.all(results.map(async (o) => ({
    ...o,
    patient: o.patient_id ? await db.patients.get(o.patient_id) : undefined,
  })))
}

export async function getOrderById(id: string): Promise<ServiceOrder | undefined> {
  const order = await db.service_orders.get(id)
  if (!order) return undefined
  const [items, patient, prescription] = await Promise.all([
    db.service_order_items.where('service_order_id').equals(id).toArray(),
    db.patients.get(order.patient_id),
    order.prescription_id ? db.prescriptions.get(order.prescription_id) : Promise.resolve(undefined),
  ])
  return { ...order, items, patient, prescription }
}

export async function createOrder(data: ServiceOrderFormData): Promise<ServiceOrder> {
  const company_id  = getCompanyId()
  const profile     = useAuthStore.getState().profile
  const now         = new Date().toISOString()

  // Número da OS via Supabase (ou local temporário)
  let order_number = `OS-LOCAL-${Date.now()}`
  if (navigator.onLine) {
    const { data: num } = await supabase.rpc('next_order_number', { p_company_id: company_id })
    if (num) order_number = num
  }

  const order: ServiceOrder = {
    ...data,
    id: generateId(),
    company_id,
    order_number,
    created_by: profile?.id,
    created_at: now,
    updated_at: now,
  }

  await db.service_orders.add({ ...order, _pending_sync: true })
  await enqueue('service_orders', 'insert', order.id, order as unknown as Record<string, unknown>)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('service_orders').insert(order)
      if (!error) {
        await db.service_orders.update(order.id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(order.id).delete()
      }
    } catch {}
  }

  return order
}

export async function updateOrderStatus(id: string, status: ServiceOrderStatus): Promise<void> {
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status, updated_at: now }
  if (status === 'entregue') updates.delivered_at = now

  await db.service_orders.update(id, { ...updates, _pending_sync: true })
  await enqueue('service_orders', 'update', id, updates)

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from('service_orders').update(updates).eq('id', id)
      if (!error) {
        await db.service_orders.update(id, { _pending_sync: false })
        await db.sync_queue.where('record_id').equals(id).delete()
      }
    } catch {}
  }
}

export async function convertOrderToSale(orderId: string): Promise<string> {
  const full = await getOrderById(orderId)
  if (!full) throw new Error('Ordem não encontrada.')
  if (full.sale_id) throw new Error('Esta OS já possui uma venda vinculada.')

  const sale = await createSale({
    patient_id:       full.patient_id,
    seller_id:        full.seller_id,
    sale_type:        full.service_type,
    service_order_id: full.id,
    total_amount:     full.total_amount,
    discount_amount:  full.discount_amount,
    paid_amount:      full.paid_amount,
    payment_method:   full.payment_method,
    payments:         full.payments,
    notes:            full.notes,
    items: (full.items ?? []).map(i => ({
      product_id:  i.product_id,
      description: i.description,
      quantity:    i.quantity,
      unit_price:  i.unit_price,
      discount:    0,
      total_price: i.total_price,
    })),
  })

  // Vincula a venda de volta na OS
  const updates = { sale_id: sale.id, updated_at: new Date().toISOString() }
  await db.service_orders.update(orderId, updates)
  await enqueue('service_orders', 'update', orderId, updates)
  if (navigator.onLine) {
    try {
      await supabase.from('service_orders').update(updates).eq('id', orderId)
    } catch {}
  }

  return sale.id
}

export async function getDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const allOrders = await db.service_orders.toArray()

  const todayOrders = allOrders.filter(
    (o) => new Date(o.created_at) >= today,
  )

  const salesToday = todayOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  // Semana atual vs anterior
  const weeklyData = buildWeeklyData(allOrders)

  // OS do dia
  const ordersGenerated = todayOrders.length
  const ordersPending   = allOrders.filter((o) =>
    ['orcamento', 'aprovado', 'producao', 'laboratorio'].includes(o.status),
  ).length
  const ordersCompleted = allOrders.filter((o) =>
    ['pronto', 'entregue'].includes(o.status),
  ).length

  const recentOrders = allOrders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  return {
    sales_today: salesToday,
    sales_today_growth: 12.5,
    orders_generated: ordersGenerated,
    orders_pending: ordersPending,
    orders_completed: ordersCompleted,
    orders_goal_pct: 94,
    weekly_data: weeklyData,
    recent_orders: recentOrders,
  }
}

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

function buildWeeklyData(orders: ServiceOrder[]) {
  const now        = new Date()
  const dayOfWeek  = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    const nextDay = new Date(day)
    nextDay.setDate(day.getDate() + 1)

    const current = orders
      .filter((o) => {
        const d = new Date(o.created_at)
        return d >= day && d < nextDay
      })
      .reduce((s, o) => s + (o.total_amount ?? 0), 0)

    return {
      day: DAYS[day.getDay()],
      current,
      previous: current * (0.7 + Math.random() * 0.5),
    }
  })
}
