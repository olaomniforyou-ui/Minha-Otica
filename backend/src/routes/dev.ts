import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

router.get('/status', async (_req: Request, res: Response) => {
  const requestStart = Date.now()

  let dbStatus: 'connected' | 'disconnected' = 'disconnected'
  let dbLatency = 0

  try {
    const dbStart = Date.now()
    // Qualquer resposta do Supabase (incluindo erro de tabela) confirma conectividade
    await supabaseAdmin.from('companies').select('id').limit(1)
    dbLatency = Date.now() - dbStart
    dbStatus = 'connected'
  } catch {
    dbStatus = 'disconnected'
  }

  const apiLatency = Date.now() - requestStart

  res.json({
    success: true,
    data: {
      api: {
        status: 'up',
        uptimeSeconds: Math.floor(process.uptime()),
        latencyMs: apiLatency,
        environment: process.env.NODE_ENV ?? 'development',
        version: '1.0.0-beta',
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
        provider: 'Supabase / PostgreSQL 15',
      },
      storage: {
        status: dbStatus === 'connected' ? 'online' : 'unknown',
        provider: 'Supabase Storage',
      },
      sprint: {
        current: 1,
        name: 'Fundação SaaS e Shell do Produto',
        period: '18/05 a 24/05/2026',
        previousSprint: 'Sprint 0 — Concluída em 16/05/2026',
        overallProgress: 6,
      },
      modules: {
        total: 23,
        inProgress: 2,
        partial: 11,
        completed: 0,
        pending: 10,
      },
      timestamp: new Date().toISOString(),
    },
  })
})

export default router
