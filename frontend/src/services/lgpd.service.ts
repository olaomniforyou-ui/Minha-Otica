import { useAuthStore } from '@/store/authStore'
import type { ConsentLog, AuditLog } from '@/types'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Consentimento ────────────────────────────────────────────────────────
export async function recordConsent(patientId: string, termsVersion = '1.0'): Promise<void> {
  await fetch(`${BASE}/api/lgpd/consent`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body:    JSON.stringify({ patient_id: patientId, terms_version: termsVersion }),
  })
}

export async function getPatientConsents(patientId: string): Promise<ConsentLog[]> {
  const res = await fetch(`${BASE}/api/lgpd/patients/${patientId}/consent`, {
    headers: authHeader(),
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

// ─── Exportação de dados ──────────────────────────────────────────────────
export async function exportPatientData(patientId: string, patientName: string): Promise<void> {
  const res = await fetch(`${BASE}/api/lgpd/patients/${patientId}/export`, {
    headers: authHeader(),
  })
  if (!res.ok) throw new Error('Erro ao exportar dados do titular.')

  const json = await res.json()
  const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `dados-${patientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Direito ao esquecimento ──────────────────────────────────────────────
export async function forgetPatient(patientId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/lgpd/patients/${patientId}/forget`, {
    method:  'DELETE',
    headers: authHeader(),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? 'Erro ao anonimizar paciente.')
  }
}

// ─── Logs de auditoria (admin) ────────────────────────────────────────────
export async function getAuditLogs(filters?: { table_name?: string; action?: string }): Promise<AuditLog[]> {
  const params = new URLSearchParams()
  if (filters?.table_name) params.set('table_name', filters.table_name)
  if (filters?.action)     params.set('action', filters.action)

  const res = await fetch(`${BASE}/api/lgpd/audit-logs?${params}`, {
    headers: authHeader(),
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}
