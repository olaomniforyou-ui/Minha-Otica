import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { logAudit } from '../middleware/auditLog'
import crypto from 'crypto'

const router = Router()

const itemSchema = z.object({
  product_id:        z.string().uuid().optional(),
  description:       z.string().min(1).max(300),
  quantity:          z.number().int().positive(),
  quantity_received: z.number().int().min(0).optional(),
  unit_cost:         z.number().min(0),
  total_cost:        z.number().min(0),
})

const purchaseOrderSchema = z.object({
  supplier_id:       z.string().uuid().optional(),
  notes:             z.string().max(1000).optional(),
  expected_delivery: z.string().optional(),
  items:             z.array(itemSchema).min(1),
})

// GET /purchases — lista pedidos da empresa
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('purchase_orders')
      .select('*, supplier:suppliers(id,name), items:purchase_items(*)')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ success: false, message: error.message })
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /purchases — cria pedido
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = purchaseOrderSchema.parse(req.body)
    const now  = new Date().toISOString()
    const id   = crypto.randomUUID()

    const total_amount = body.items.reduce((s, i) => s + i.total_cost, 0)

    const { error: orderError } = await supabaseAdmin.from('purchase_orders').insert({
      id,
      company_id:        req.companyId,
      order_number:      `PC-${Date.now()}`,
      supplier_id:       body.supplier_id ?? null,
      status:            'rascunho',
      total_amount,
      notes:             body.notes ?? null,
      expected_delivery: body.expected_delivery ?? null,
      created_by:        req.userId,
      created_at:        now,
      updated_at:        now,
    })

    if (orderError) return res.status(500).json({ success: false, message: orderError.message })

    const items = body.items.map(i => ({
      ...i,
      id:                crypto.randomUUID(),
      purchase_order_id: id,
    }))

    const { error: itemsError } = await supabaseAdmin.from('purchase_items').insert(items)
    if (itemsError) return res.status(500).json({ success: false, message: itemsError.message })

    await logAudit({ companyId: req.companyId, userId: req.userId, action: 'create_purchase_order', tableName: 'purchase_orders', recordId: id })

    res.status(201).json({ success: true, data: { id, items } })
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ success: false, message: e.errors })
    res.status(500).json({ success: false, message: e.message })
  }
})

// PATCH /purchases/:id/status — atualiza status
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = z.object({
      status: z.enum(['rascunho', 'enviado', 'parcial', 'recebido', 'cancelado']),
    }).parse(req.body)

    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'recebido') patch.received_at = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from('purchase_orders')
      .update(patch)
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)

    if (error) return res.status(500).json({ success: false, message: error.message })
    res.json({ success: true })
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ success: false, message: e.errors })
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /purchases/:id/receive — dar entrada de itens e atualizar estoque
router.post('/:id/receive', requireAuth, async (req, res) => {
  try {
    const { items } = z.object({
      items: z.array(z.object({
        id:                z.string().uuid(),
        quantity_received: z.number().int().min(0),
        unit_cost:         z.number().min(0),
      })),
    }).parse(req.body)

    const now = new Date().toISOString()

    for (const item of items) {
      if (item.quantity_received === 0) continue

      await supabaseAdmin
        .from('purchase_items')
        .update({ quantity_received: item.quantity_received })
        .eq('id', item.id)

      const { data: pi } = await supabaseAdmin
        .from('purchase_items')
        .select('product_id, quantity')
        .eq('id', item.id)
        .single()

      if (!pi?.product_id) continue

      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('stock_quantity')
        .eq('id', pi.product_id)
        .single()

      const prev = prod?.stock_quantity ?? 0
      const next = prev + item.quantity_received

      await supabaseAdmin.from('products').update({ stock_quantity: next }).eq('id', pi.product_id)

      await supabaseAdmin.from('stock_movements').insert({
        id:             crypto.randomUUID(),
        company_id:     req.companyId,
        product_id:     pi.product_id,
        type:           'entrada',
        quantity:       item.quantity_received,
        previous_qty:   prev,
        new_qty:        next,
        unit_cost:      item.unit_cost,
        reason:         'Recebimento de compra',
        reference_id:   req.params.id,
        reference_type: 'purchase_order',
        created_by:     req.userId,
        created_at:     now,
      })
    }

    // Recalcula status do pedido
    const { data: allItems } = await supabaseAdmin
      .from('purchase_items')
      .select('quantity, quantity_received')
      .eq('purchase_order_id', req.params.id)

    const allReceived = allItems?.every(i => (i.quantity_received ?? 0) >= i.quantity)
    const anyReceived = allItems?.some(i => (i.quantity_received ?? 0) > 0)
    const newStatus = allReceived ? 'recebido' : anyReceived ? 'parcial' : 'enviado'

    const patch: Record<string, unknown> = { status: newStatus, updated_at: now }
    if (newStatus === 'recebido') patch.received_at = now

    await supabaseAdmin
      .from('purchase_orders')
      .update(patch)
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)

    await logAudit({ companyId: req.companyId, userId: req.userId, action: 'receive_purchase_order', tableName: 'purchase_orders', recordId: req.params.id })

    res.json({ success: true, data: { status: newStatus } })
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ success: false, message: e.errors })
    res.status(500).json({ success: false, message: e.message })
  }
})

export default router
