import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { generateId } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { StockMovement, StockMovementType } from '@/types'

function getCompanyId(): string {
  const company = useAuthStore.getState().company
  if (!company) throw new Error('Empresa não identificada.')
  return company.id
}

interface MoveStockParams {
  product_id:      string
  type:            StockMovementType
  quantity:        number
  unit_cost?:      number
  reason?:         string
  reference_id?:   string
  reference_type?: string
}

export async function moveStock(params: MoveStockParams): Promise<StockMovement> {
  const company_id = getCompanyId()
  const profile    = useAuthStore.getState().profile

  // Se online, tenta a função atômica do Supabase
  if (navigator.onLine) {
    const { data, error } = await supabase.rpc('move_stock', {
      p_product_id:     params.product_id,
      p_type:           params.type,
      p_quantity:       params.quantity,
      p_unit_cost:      params.unit_cost ?? null,
      p_reason:         params.reason ?? null,
      p_reference_id:   params.reference_id ?? null,
      p_reference_type: params.reference_type ?? null,
    })

    if (!error && data) {
      const movement = data as StockMovement
      // Atualiza Dexie com os dados vindos do servidor
      await db.stock_movements.put(movement)
      const product = await db.products.get(params.product_id)
      if (product) {
        await db.products.update(params.product_id, {
          stock_quantity: movement.new_qty,
          updated_at: new Date().toISOString(),
        })
      }
      return movement
    }
    // RPC falhou (produto ainda não sincronizado, sem conexão real, etc.)
    // Cai no caminho offline abaixo
  }

  // Offline / fallback: calcula localmente e enfileira para sync
  const product = await db.products.get(params.product_id)
  if (!product) throw new Error('Produto não encontrado no estoque local.')

  const previous_qty = product.stock_quantity
  let new_qty: number

  switch (params.type) {
    case 'entrada':
    case 'devolucao':
      new_qty = previous_qty + params.quantity
      break
    case 'saida':
      new_qty = previous_qty - params.quantity
      if (new_qty < 0) throw new Error(`Estoque insuficiente. Disponível: ${previous_qty}.`)
      break
    case 'ajuste':
      new_qty = params.quantity
      break
  }

  const now = new Date().toISOString()
  const movement: StockMovement = {
    id:             generateId(),
    company_id,
    product_id:     params.product_id,
    type:           params.type,
    quantity:       params.quantity,
    previous_qty,
    new_qty,
    unit_cost:      params.unit_cost,
    reason:         params.reason,
    reference_id:   params.reference_id,
    reference_type: params.reference_type,
    created_by:     profile?.id,
    created_at:     now,
  }

  await db.stock_movements.add({ ...movement, _pending_sync: true })
  await db.products.update(params.product_id, { stock_quantity: new_qty, updated_at: now, _pending_sync: true })

  await enqueue('stock_movements', 'insert', movement.id, movement as unknown as Record<string, unknown>)
  await enqueue('products', 'update', params.product_id, { stock_quantity: new_qty, updated_at: now })

  return movement
}

export async function getStockMovements(productId?: string): Promise<StockMovement[]> {
  const company_id = getCompanyId()

  // Fallback: se Dexie estiver vazio, busca no Supabase
  const count = await db.stock_movements.where('company_id').equals(company_id).count()
  if (count === 0 && navigator.onLine) {
    try {
      let q = supabase.from('stock_movements').select('*').eq('company_id', company_id)
      if (productId) q = q.eq('product_id', productId)
      const { data } = await q.order('created_at', { ascending: false }).limit(300)
      if (data?.length) await db.stock_movements.bulkPut(data)
    } catch {}
  }

  // Lê do Dexie e ordena por created_at desc
  let movements: StockMovement[]
  if (productId) {
    movements = await db.stock_movements
      .where('product_id').equals(productId)
      .toArray() as StockMovement[]
  } else {
    movements = await db.stock_movements
      .where('company_id').equals(company_id)
      .toArray() as StockMovement[]
  }

  movements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Enriquece com o nome do produto
  const productIds = [...new Set(movements.map(m => m.product_id))]
  const prods = await Promise.all(productIds.map(id => db.products.get(id)))
  const productMap = new Map(prods.filter(Boolean).map(p => [p!.id, p!]))

  return movements.map(m => ({ ...m, product: productMap.get(m.product_id) }))
}
