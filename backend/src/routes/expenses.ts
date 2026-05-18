import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { logAudit } from '../middleware/auditLog'
import crypto from 'crypto'

const router = Router()

const expenseSchema = z.object({
  description: z.string().min(1).max(300),
  amount:      z.number().positive(),
  category:    z.enum(['aluguel','energia','agua','internet','fornecedor','salario','marketing','manutencao','impostos','outro']),
  due_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_paid:     z.boolean().optional().default(false),
  paid_at:     z.string().optional().nullable(),
  notes:       z.string().max(1000).optional().nullable(),
})

// GET /expenses — lista do mês corrente (opcionalmente filtrado por data)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string }

    let query = supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('company_id', req.companyId)
      .order('due_date', { ascending: true })

    if (from) query = query.gte('due_date', from)
    if (to)   query = query.lte('due_date', to)

    const { data, error } = await query
    if (error) return res.status(500).json({ success: false, message: error.message })
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /expenses — cria despesa
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = expenseSchema.parse(req.body)
    const now  = new Date().toISOString()
    const id   = crypto.randomUUID()

    const expense = {
      id,
      company_id:  req.companyId,
      created_by:  req.userId,
      created_at:  now,
      updated_at:  now,
      ...body,
      paid_at: body.is_paid ? (body.paid_at ?? now) : null,
      notes:   body.notes ?? null,
    }

    const { error } = await supabaseAdmin.from('expenses').insert(expense)
    if (error) return res.status(500).json({ success: false, message: error.message })

    await logAudit({ companyId: req.companyId, userId: req.userId, action: 'create_expense', tableName: 'expenses', recordId: id })

    res.status(201).json({ success: true, data: expense })
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ success: false, message: e.errors })
    res.status(500).json({ success: false, message: e.message })
  }
})

// PATCH /expenses/:id — atualiza despesa
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const body = expenseSchema.partial().parse(req.body)
    const patch = { ...body, updated_at: new Date().toISOString() }

    const { error } = await supabaseAdmin
      .from('expenses')
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

// POST /expenses/:id/pay — marca como paga
router.post('/:id/pay', requireAuth, async (req, res) => {
  try {
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('expenses')
      .update({ is_paid: true, paid_at: now, updated_at: now })
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)

    if (error) return res.status(500).json({ success: false, message: error.message })

    await logAudit({ companyId: req.companyId, userId: req.userId, action: 'pay_expense', tableName: 'expenses', recordId: req.params.id })

    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// DELETE /expenses/:id — exclui despesa
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)

    if (error) return res.status(500).json({ success: false, message: error.message })

    await logAudit({ companyId: req.companyId, userId: req.userId, action: 'delete_expense', tableName: 'expenses', recordId: req.params.id })

    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message })
  }
})

export default router
