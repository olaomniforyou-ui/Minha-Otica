import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const url     = process.env.SUPABASE_URL!
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.SUPABASE_ANON_KEY!

if (!url || !svcKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.')
}

// Cliente com service role (backend — nunca expor no frontend)
export const supabaseAdmin = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Cliente com anon key (para operações como usuário)
export const supabase = createClient(url, anonKey)
