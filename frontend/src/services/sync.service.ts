import { supabase } from '@/lib/supabase'
import {
  db, getPendingItems, markSynced, markError,
  getPendingCount, clearSyncedItems,
} from '@/db'
import { useSyncStore } from '@/store/syncStore'
import { useAuthStore } from '@/store/authStore'

// ── Horários de sincronização automática (hora:minuto) ────────
const SYNC_TIMES = ['09:00', '12:00', '15:00', '17:00']

let schedulerInterval: ReturnType<typeof setInterval> | null = null

// ── Executar sync ─────────────────────────────────────────────
export async function runSync(source: 'manual' | 'scheduled' = 'manual') {
  const store = useSyncStore.getState()
  const auth  = useAuthStore.getState()

  if (store.isSyncing) return
  if (!navigator.onLine) {
    store.setError('Sem conexão. Dados salvos localmente.')
    return
  }
  if (!auth.session) return

  store.setIsSyncing(true)
  store.setError(null)

  let successCount = 0
  let errorCount   = 0

  try {
    // 1. Pull: busca dados novos do servidor
    await pullFromServer()

    // 2. Push: envia itens pendentes
    const pending = await getPendingItems()

    for (const item of pending) {
      try {
        await pushItem(item)
        await markSynced(item.id!)
        successCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await markError(item.id!, msg)
        errorCount++
      }
    }

    // 3. Limpa itens sincronizados antigos
    await clearSyncedItems()

    // 4. Registra log de sync no Supabase
    const company_id = auth.company?.id
    if (company_id) {
      await supabase.from('sync_logs').insert({
        company_id,
        records_synced: successCount,
        status: errorCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'error',
        source,
      })
    }

    store.setLastSyncedAt(new Date().toISOString())
    const pending_count = await getPendingCount()
    store.setPendingCount(pending_count)

    if (errorCount > 0) {
      store.setError(`${errorCount} registro(s) com erro. ${successCount} sincronizado(s).`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro na sincronização.'
    store.setError(msg)
  } finally {
    store.setIsSyncing(false)
  }
}

// ── Push de um item ───────────────────────────────────────────
async function pushItem(item: Awaited<ReturnType<typeof getPendingItems>>[0]) {
  const { table_name, operation, record_id, data } = item

  if (operation === 'insert') {
    const { error } = await supabase.from(table_name).upsert(data)
    if (error) throw new Error(error.message)
  }

  if (operation === 'update') {
    const { error } = await supabase.from(table_name).update(data).eq('id', record_id)
    if (error) throw new Error(error.message)
  }

  if (operation === 'delete') {
    const { error } = await supabase.from(table_name).delete().eq('id', record_id)
    if (error) throw new Error(error.message)
  }
}

// ── Pull: sincroniza dados do servidor para Dexie ─────────────
export async function pullFromServer() {
  const auth = useAuthStore.getState()
  const company_id = auth.company?.id
  if (!company_id) return

  const lastSync = useSyncStore.getState().lastSyncedAt

  async function fetchTable(tableName: string) {
    let q = supabase.from(tableName).select('*').eq('company_id', company_id)
    if (lastSync) q = q.gte('updated_at', lastSync)
    const { data } = await q
    return data ?? []
  }

  // Pacientes
  const patients = await fetchTable('patients')
  if (patients.length) await db.patients.bulkPut(patients)

  // Produtos
  const products = await fetchTable('products')
  if (products.length) await db.products.bulkPut(products)

  // Categorias (sem updated_at)
  const { data: categories } = await supabase
    .from('product_categories')
    .select('*')
    .eq('company_id', company_id)
  if (categories?.length) await db.product_categories.bulkPut(categories)

  // Ordens de serviço
  const orders = await fetchTable('service_orders')
  if (orders.length) await db.service_orders.bulkPut(orders)

  // Itens das OS
  if (orders.length) {
    const orderIds = orders.map((o: { id: string }) => o.id)
    const { data: items } = await supabase
      .from('service_order_items')
      .select('*')
      .in('service_order_id', orderIds)
    if (items?.length) await db.service_order_items.bulkPut(items)
  }

  // Lab trackings
  const labs = await fetchTable('lab_trackings')
  if (labs.length) await db.lab_trackings.bulkPut(labs)

  // Fornecedores
  const suppliers = await fetchTable('suppliers')
  if (suppliers.length) await db.suppliers.bulkPut(suppliers)

  // Marcas
  const brands = await fetchTable('brands')
  if (brands.length) await db.brands.bulkPut(brands)

  // Modelos
  const models = await fetchTable('models')
  if (models.length) await db.models.bulkPut(models)

  // Movimentações de estoque (sem updated_at — usar created_at)
  let movQuery = supabase
    .from('stock_movements')
    .select('*')
    .eq('company_id', company_id)
  if (lastSync) movQuery = movQuery.gte('created_at', lastSync)
  const { data: movements } = await movQuery
  if (movements?.length) await db.stock_movements.bulkPut(movements)

  // Vendas
  const sales = await fetchTable('sales')
  if (sales.length) await db.sales.bulkPut(sales)

  // Itens de venda
  if (sales.length) {
    const saleIds = sales.map((s: { id: string }) => s.id)
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('*')
      .in('sale_id', saleIds)
    if (saleItems?.length) await db.sale_items.bulkPut(saleItems)
  }
}

// ── Scheduler automático ──────────────────────────────────────
export function startSyncScheduler() {
  if (schedulerInterval) return

  schedulerInterval = setInterval(() => {
    const now     = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    if (SYNC_TIMES.includes(timeStr) && navigator.onLine) {
      runSync('scheduled')
    }
  }, 60_000) // verifica a cada minuto
}

export function stopSyncScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}

// ── Atualiza contador de pendentes ────────────────────────────
export async function refreshPendingCount() {
  const count = await getPendingCount()
  useSyncStore.getState().setPendingCount(count)
}
