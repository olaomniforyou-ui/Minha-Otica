import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? '',
)

// GET /api/catalog/:companyId — rota pública, sem autenticação
router.get('/:companyId', async (req, res) => {
  const { companyId } = req.params

  const [companyRes, productsRes, categoriesRes] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, email, phone, address, city, state, logo_url')
      .eq('id', companyId)
      .maybeSingle(),
    supabase
      .from('products')
      .select('id, name, description, sale_price, stock_quantity, category_id, image_url')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name'),
    supabase
      .from('product_categories')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name'),
  ])

  if (!companyRes.data) {
    return res.status(404).json({ error: 'Ótica não encontrada.' })
  }

  res.json({
    company: companyRes.data,
    products: productsRes.data ?? [],
    categories: categoriesRes.data ?? [],
  })
})

export default router
