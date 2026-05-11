import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'
import { requireAdmin, type AuthRequest } from '../middleware/auth'

const router = Router()

const createUserSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8),
  full_name: z.string().min(2),
  role:      z.enum(['admin', 'gerente', 'atendente', 'tecnico']),
})

// POST /api/admin/users — cria usuário (apenas admin/gerente)
router.post('/users', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const body = createUserSchema.parse(req.body)

    // Cria o usuário no auth do Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:             body.email,
      password:          body.password,
      email_confirm:     true,
    })

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message ?? 'Erro ao criar usuário.' })
    }

    // Cria o perfil
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id:         authData.user.id,
      company_id: req.companyId,
      full_name:  body.full_name,
      role:       body.role,
    })

    if (profileError) {
      // Rollback: remove o usuário auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(400).json({ error: profileError.message })
    }

    res.status(201).json({
      id:        authData.user.id,
      email:     body.email,
      full_name: body.full_name,
      role:      body.role,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/users — lista usuários da empresa
router.get('/users', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, is_active, created_at')
      .eq('company_id', req.companyId!)
      .order('full_name')

    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/users/:id — ativa/desativa usuário
router.patch('/users/:id', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { is_active } = req.body as { is_active: boolean }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active })
      .eq('id', req.params.id)
      .eq('company_id', req.companyId!)

    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
