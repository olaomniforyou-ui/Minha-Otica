import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

const registerSchema = z.object({
  company: z.object({
    name:  z.string().min(2, 'Nome da empresa obrigatório.'),
    cnpj:  z.string().min(14, 'CNPJ inválido.'),
    phone: z.string().min(10, 'Telefone inválido.'),
    email: z.string().email('E-mail da empresa inválido.'),
  }),
  admin: z.object({
    full_name: z.string().min(2, 'Nome do administrador obrigatório.'),
    email:     z.string().email('E-mail inválido.'),
    password:  z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.'),
  }),
})

// POST /api/auth/register — cadastro público de nova empresa (SaaS)
router.post('/', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Dados inválidos.'
      return res.status(400).json({ error: msg })
    }

    const { company, admin } = parsed.data

    // 1. Verifica se o CNPJ já existe
    const { data: existing } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('cnpj', company.cnpj.replace(/\D/g, ''))
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Este CNPJ já está cadastrado.' })
    }

    // 2. Cria a empresa
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name:  company.name,
        cnpj:  company.cnpj.replace(/\D/g, ''), // armazena só dígitos
        phone: company.phone.replace(/\D/g, ''),
        email: company.email,
      })
      .select()
      .single()

    if (companyError || !newCompany) {
      return res.status(400).json({ error: companyError?.message ?? 'Erro ao criar empresa.' })
    }

    // 3. Cria o usuário admin no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:         admin.email,
      password:      admin.password,
      email_confirm: true,               // confirma e-mail automaticamente
    })

    if (authError || !authData.user) {
      // Rollback: remove a empresa
      await supabaseAdmin.from('companies').delete().eq('id', newCompany.id)
      return res.status(400).json({ error: authError?.message ?? 'Erro ao criar usuário.' })
    }

    // 4. Cria o perfil do admin
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id:         authData.user.id,
      company_id: newCompany.id,
      full_name:  admin.full_name,
      role:       'admin',
    })

    if (profileError) {
      // Rollback: remove usuário e empresa
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin.from('companies').delete().eq('id', newCompany.id)
      return res.status(400).json({ error: profileError.message })
    }

    // 5. Semeia as categorias padrão
    await supabaseAdmin.rpc('seed_default_categories', { p_company_id: newCompany.id })

    // 6. Inicializa a sequência de OS
    await supabaseAdmin
      .from('order_sequences')
      .insert({ company_id: newCompany.id, last_number: 0 })

    res.status(201).json({
      message:    'Empresa criada com sucesso.',
      company_id: newCompany.id,
      user_id:    authData.user.id,
    })
  } catch (err) {
    next(err)
  }
})

export default router
