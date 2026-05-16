import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { logAudit } from '../middleware/auditLog'

const router = Router()

// ─── POST /api/lgpd/consent ───────────────────────────────────────────────
// Registra o consentimento do paciente (LGPD art. 7 e art. 11)
router.post('/consent', requireAuth, async (req, res) => {
  const schema = z.object({
    patient_id:    z.string().uuid(),
    terms_version: z.string().default('1.0'),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Dados inválidos.' })
  }

  const { data, error } = await supabaseAdmin
    .from('consent_logs')
    .insert({
      company_id:    req.companyId!,
      patient_id:    parsed.data.patient_id,
      user_id:       req.userId,
      terms_version: parsed.data.terms_version,
      created_at:    new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return res.status(500).json({ success: false, error: error.message })

  await logAudit({
    companyId: req.companyId!,
    userId:    req.userId,
    action:    'record_consent',
    tableName: 'patients',
    recordId:  parsed.data.patient_id,
  })

  return res.status(201).json({ success: true, data })
})

// ─── GET /api/lgpd/patients/:id/consent ──────────────────────────────────
// Lista os consentimentos registrados para um paciente
router.get('/patients/:id/consent', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('consent_logs')
    .select('*')
    .eq('patient_id', req.params.id)
    .eq('company_id', req.companyId!)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ success: false, error: error.message })
  return res.json({ success: true, data: data ?? [] })
})

// ─── GET /api/lgpd/patients/:id/export ───────────────────────────────────
// Exporta todos os dados do titular (LGPD art. 18, II)
router.get('/patients/:id/export', requireAuth, async (req, res) => {
  const { id } = req.params

  const { data: patient, error: patientErr } = await supabaseAdmin
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('company_id', req.companyId!)
    .single()

  if (patientErr || !patient) {
    return res.status(404).json({ success: false, error: 'Paciente não encontrado.' })
  }

  const [{ data: prescriptions }, { data: consents }] = await Promise.all([
    supabaseAdmin
      .from('prescriptions')
      .select('*')
      .eq('patient_id', id)
      .eq('company_id', req.companyId!)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('consent_logs')
      .select('*')
      .eq('patient_id', id)
      .order('created_at', { ascending: false }),
  ])

  await logAudit({
    companyId: req.companyId!,
    userId:    req.userId,
    action:    'export_patient_data',
    tableName: 'patients',
    recordId:  id,
  })

  return res.json({
    success: true,
    data: {
      exported_at:   new Date().toISOString(),
      exported_by:   req.userId,
      patient,
      prescriptions: prescriptions ?? [],
      consent_logs:  consents ?? [],
    },
  })
})

// ─── DELETE /api/lgpd/patients/:id/forget ────────────────────────────────
// Anonimiza o cadastro do titular (LGPD art. 18, IV — direito ao esquecimento)
router.delete('/patients/:id/forget', requireAuth, async (req, res) => {
  const { id } = req.params

  const { data: patient, error: findErr } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('id', id)
    .eq('company_id', req.companyId!)
    .single()

  if (findErr || !patient) {
    return res.status(404).json({ success: false, error: 'Paciente não encontrado.' })
  }

  const { error } = await supabaseAdmin
    .from('patients')
    .update({
      full_name:      'Paciente Anonimizado',
      cpf:            null,
      rg:             null,
      phone:          '00000000000',
      whatsapp:       null,
      email:          null,
      birth_date:     null,
      gender:         null,
      address:        null,
      notes:          '[Dados removidos a pedido do titular — LGPD art. 18]',
      is_active:      false,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .eq('company_id', req.companyId!)

  if (error) return res.status(500).json({ success: false, error: error.message })

  await logAudit({
    companyId: req.companyId!,
    userId:    req.userId,
    action:    'forget_patient',
    tableName: 'patients',
    recordId:  id,
  })

  return res.json({ success: true })
})

// ─── GET /api/lgpd/audit-logs ────────────────────────────────────────────
// Lista logs de auditoria (somente admin/gerente)
router.get('/audit-logs', requireAdmin, async (req, res) => {
  const { table_name, action } = req.query

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*')
    .eq('company_id', req.companyId!)
    .order('created_at', { ascending: false })
    .limit(200)

  if (table_name && typeof table_name === 'string') query = query.eq('table_name', table_name)
  if (action && typeof action === 'string')         query = query.eq('action', action)

  const { data, error } = await query
  if (error) return res.status(500).json({ success: false, error: error.message })
  return res.json({ success: true, data: data ?? [] })
})

export default router
