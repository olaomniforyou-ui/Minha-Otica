import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { logAudit } from '../middleware/auditLog'
import crypto from 'crypto'

const router = Router()

const convenioSchema = z.object({
  name:                z.string().min(2).max(200),
  cnpj:                z.string().optional().nullable(),
  tipo:                z.enum(['saude', 'odonto', 'assistencia', 'outro']),
  desconto_percentual: z.number().min(0).max(100).default(0),
  contato_nome:        z.string().optional().nullable(),
  contato_telefone:    z.string().optional().nullable(),
  contato_email:       z.string().email().optional().nullable(),
  observacoes:         z.string().max(1000).optional().nullable(),
  is_active:           z.boolean().default(true),
})

// GET /convenios
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('convenios')
      .select('*')
      .eq('company_id', req.companyId)
      .order('name', { ascending: true })

    if (error) return res.status(500).json({ success: false, message: error.message })
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /convenios
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = convenioSchema.parse(req.body)
    const now  = new Date().toISOString()
    const id   = crypto.randomUUID()

    const record = {
      id,
      company_id: req.companyId,
      created_by: req.userId,
      created_at: now,
      updated_at: now,
      ...body,
    }

    const { error } = await supabaseAdmin.from('convenios').insert(record)
    if (error) return res.status(500).json({ success: false, message: error.message })

    await logAudit({ companyId: req.companyId, userId: req.userId, action: 'create_convenio', tableName: 'convenios', recordId: id })

    res.status(201).json({ success: true, data: record })
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ success: false, message: e.errors })
    res.status(500).json({ success: false, message: e.message })
  }
})

// PATCH /convenios/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const body  = convenioSchema.partial().parse(req.body)
    const patch = { ...body, updated_at: new Date().toISOString() }

    const { error } = await supabaseAdmin
      .from('convenios')
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

// DELETE /convenios/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('convenios')
      .delete()
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)

    if (error) return res.status(500).json({ success: false, message: error.message })

    await logAudit({ companyId: req.companyId, userId: req.userId, action: 'delete_convenio', tableName: 'convenios', recordId: req.params.id })

    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message })
  }
})

export default router
