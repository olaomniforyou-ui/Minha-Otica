import { Router } from 'express'
import { z } from 'zod'
import { extractPrescription } from '../controllers/prescriptionController'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

// ─── Extração por IA — pública (sem auth) ────────────────────────────────
router.post('/extract', extractPrescription)

// ─── Schema Zod ──────────────────────────────────────────────────────────
const prescriptionSchema = z.object({
  patient_id:  z.string().uuid(),
  od_esf:      z.number().min(-25).max(25).nullable().optional(),
  od_cil:      z.number().min(-10).max(10).nullable().optional(),
  od_eixo:     z.number().int().min(0).max(180).nullable().optional(),
  od_add:      z.number().min(0).max(4).nullable().optional(),
  od_dnp:      z.number().min(20).max(40).nullable().optional(),
  od_altura:   z.number().int().min(10).max(40).nullable().optional(),
  oe_esf:      z.number().min(-25).max(25).nullable().optional(),
  oe_cil:      z.number().min(-10).max(10).nullable().optional(),
  oe_eixo:     z.number().int().min(0).max(180).nullable().optional(),
  oe_add:      z.number().min(0).max(4).nullable().optional(),
  oe_dnp:      z.number().min(20).max(40).nullable().optional(),
  oe_altura:   z.number().int().min(10).max(40).nullable().optional(),
  doctor_name: z.string().max(200).nullable().optional(),
  crm:         z.string().max(30).nullable().optional(),
  exam_date:   z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  notes:       z.string().max(1000).nullable().optional(),
})

// ─── GET /api/prescription?patient_id=xxx ────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { patient_id } = req.query

  let query = supabaseAdmin
    .from('prescriptions')
    .select('*, patient:patients(id, full_name, phone)')
    .eq('company_id', req.companyId!)
    .order('created_at', { ascending: false })

  if (patient_id && typeof patient_id === 'string') {
    query = query.eq('patient_id', patient_id)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ success: false, error: error.message })
  return res.json({ success: true, data: data ?? [] })
})

// ─── GET /api/prescription/:id ────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .select('*, patient:patients(id, full_name, phone)')
    .eq('id', req.params.id)
    .eq('company_id', req.companyId!)
    .single()

  if (error) return res.status(404).json({ success: false, error: 'Receita não encontrada.' })
  return res.json({ success: true, data })
})

// ─── POST /api/prescription ───────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const parsed = prescriptionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Dados inválidos.', details: parsed.error.flatten() })
  }

  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .insert({
      ...parsed.data,
      company_id: req.companyId!,
      created_by: req.userId,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ success: false, error: error.message })
  return res.status(201).json({ success: true, data })
})

// ─── PATCH /api/prescription/:id ─────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  const parsed = prescriptionSchema
    .omit({ patient_id: true })
    .partial()
    .safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Dados inválidos.', details: parsed.error.flatten() })
  }

  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .update(parsed.data)
    .eq('id', req.params.id)
    .eq('company_id', req.companyId!)
    .select()
    .single()

  if (error) return res.status(500).json({ success: false, error: error.message })
  return res.json({ success: true, data })
})

// ─── DELETE /api/prescription/:id ────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('prescriptions')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.companyId!)

  if (error) return res.status(500).json({ success: false, error: error.message })
  return res.json({ success: true })
})

export default router
