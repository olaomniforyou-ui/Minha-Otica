import { jsPDF } from 'jspdf'
import { useAuthStore } from '@/store/authStore'
import type { ConsentLog, AuditLog, Patient } from '@/types'
import { formatDate } from '@/lib/utils'

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

// ─── Geração de PDF ───────────────────────────────────────────────────────
export function generateConsentPDF(patient: Patient): void {
  const company = useAuthStore.getState().company
  if (!company) return

  const doc = new jsPDF()
  const margin = 20
  let y = 20

  // Cabeçalho
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Termo de Consentimento para Tratamento de Dados', doc.internal.pageSize.width / 2, y, { align: 'center' })
  
  y += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Estabelecimento: ${company.name}`, margin, y)
  if (company.cnpj) {
    y += 5
    doc.text(`CNPJ: ${company.cnpj}`, margin, y)
  }

  y += 15
  doc.setFont('helvetica', 'bold')
  doc.text('IDENTIFICAÇÃO DO TITULAR (CLIENTE/PACIENTE)', margin, y)
  
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${patient.full_name}`, margin, y)
  if (patient.cpf) {
    y += 5
    doc.text(`CPF: ${patient.cpf}`, margin, y)
  }

  y += 15
  doc.setFont('helvetica', 'bold')
  doc.text('DO CONSENTIMENTO', margin, y)
  
  y += 7
  doc.setFont('helvetica', 'normal')
  const text = `Pelo presente instrumento, eu, ${patient.full_name}, manifesto minha concordância e autorizo que a empresa ${company.name} efetue o tratamento dos meus dados pessoais, inclusive dados sensíveis de saúde (prescrições ópticas e histórico de exames), para as finalidades de:

1. Prestação de serviços ópticos e venda de produtos;
2. Manutenção de histórico para garantir a continuidade do atendimento;
3. Cumprimento de obrigações legais e fiscais;
4. Comunicação sobre status de serviços, ordens de serviço e lembretes de saúde visual.

O tratamento de dados será realizado em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD). Estou ciente de que posso revogar este consentimento a qualquer momento, bem como exercer meus direitos de acesso, retificação e exclusão, ressalvadas as obrigações legais de manutenção de registros.`

  const splitText = doc.splitTextToSize(text, doc.internal.pageSize.width - (margin * 2))
  doc.text(splitText, margin, y)
  
  y += (splitText.length * 5) + 20
  
  // Data e Assinatura
  const dateStr = new Date().toLocaleDateString('pt-BR')
  doc.text(`Data: ${dateStr}`, margin, y)

  y += 20
  doc.line(margin, y, margin + 80, y)
  y += 5
  doc.text('Assinatura do Titular', margin, y)

  y += 20
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text('Este documento é uma representação formal do consentimento digital registrado no sistema Minha Ótica.', margin, y)

  doc.save(`termo-lgpd-${patient.full_name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
