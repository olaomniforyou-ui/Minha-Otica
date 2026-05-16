import { supabaseAdmin } from '../lib/supabase'

interface AuditOpts {
  companyId: string
  userId?: string
  action: string
  tableName: string
  recordId: string
}

export async function logAudit(opts: AuditOpts): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      company_id: opts.companyId,
      user_id:    opts.userId,
      action:     opts.action,
      table_name: opts.tableName,
      record_id:  opts.recordId,
      created_at: new Date().toISOString(),
    })
  } catch {
    // audit log failures must never break the main request
  }
}
