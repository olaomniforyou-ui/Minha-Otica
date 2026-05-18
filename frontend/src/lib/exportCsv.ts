function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ]
  return '﻿' + lines.join('\r\n') // BOM for Excel UTF-8
}

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return iso }
}

function fmtCurr(n?: number | null): string {
  if (n == null) return ''
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function exportPatientsCsv(patients: {
  full_name: string; cpf?: string; phone?: string; whatsapp?: string
  email?: string; birth_date?: string; is_active: boolean; created_at: string
  origin?: string
}[]) {
  const headers = ['Nome', 'CPF', 'Telefone', 'WhatsApp', 'E-mail', 'Nascimento', 'Origem', 'Status', 'Cadastrado em']
  const rows = patients.map(p => [
    p.full_name,
    p.cpf,
    p.phone,
    p.whatsapp,
    p.email,
    fmtDate(p.birth_date),
    p.origin,
    p.is_active ? 'Ativo' : 'Inativo',
    fmtDate(p.created_at),
  ])
  download(buildCsv(headers, rows), `pacientes-${new Date().toISOString().slice(0,10)}.csv`)
}

export function exportSalesCsv(sales: {
  sale_number: string | number; customer_name?: string
  total_amount: number; paid_amount: number; payment_method?: string
  created_at: string; seller?: { full_name: string } | null
  items?: { description: string }[]
}[]) {
  const headers = ['Nº Venda', 'Cliente', 'Vendedor', 'Itens', 'Forma Pgto', 'Total', 'Pago', 'Data']
  const rows = sales.map(s => [
    `#${s.sale_number}`,
    s.customer_name,
    s.seller?.full_name,
    s.items?.map(i => i.description).join('; '),
    s.payment_method,
    fmtCurr(s.total_amount),
    fmtCurr(s.paid_amount),
    fmtDate(s.created_at),
  ])
  download(buildCsv(headers, rows), `vendas-${new Date().toISOString().slice(0,10)}.csv`)
}

export function exportProductsCsv(products: {
  name: string; sku?: string; category?: { name: string } | null
  brand?: string; sale_price: number; cost_price?: number | null
  stock_quantity: number; is_active: boolean
}[]) {
  const headers = ['Nome', 'SKU', 'Categoria', 'Marca', 'Preço Venda', 'Custo', 'Estoque', 'Status']
  const rows = products.map(p => [
    p.name,
    p.sku,
    (p.category as any)?.name ?? '',
    p.brand,
    fmtCurr(p.sale_price),
    fmtCurr(p.cost_price ?? null),
    p.stock_quantity,
    p.is_active ? 'Ativo' : 'Inativo',
  ])
  download(buildCsv(headers, rows), `produtos-${new Date().toISOString().slice(0,10)}.csv`)
}

export function exportOrdersCsv(orders: {
  order_number: string
  status: string
  service_type?: string
  total_amount: number
  paid_amount: number
  estimated_delivery?: string
  created_at: string
  patient?: { full_name: string } | null
  seller?: { full_name: string } | null
  items?: { description: string; quantity: number; unit_price: number }[]
}[]) {
  const headers = ['Nº OS', 'Status', 'Tipo', 'Paciente', 'Vendedor', 'Itens', 'Total', 'Pago', 'Entrega Prev.', 'Criado em']
  const rows = orders.map(o => [
    `#${o.order_number}`,
    o.status,
    o.service_type ?? '',
    o.patient?.full_name ?? '',
    o.seller?.full_name ?? '',
    o.items?.map(i => `${i.quantity}x ${i.description}`).join('; ') ?? '',
    fmtCurr(o.total_amount),
    fmtCurr(o.paid_amount),
    fmtDate(o.estimated_delivery),
    fmtDate(o.created_at),
  ])
  download(buildCsv(headers, rows), `ordens-servico-${new Date().toISOString().slice(0,10)}.csv`)
}

export function exportExpensesCsv(expenses: {
  description: string; category: string; amount: number
  due_date: string; is_paid: boolean; paid_at?: string; notes?: string
}[]) {
  const headers = ['Descrição', 'Categoria', 'Valor', 'Vencimento', 'Pago?', 'Data Pagamento', 'Obs']
  const rows = expenses.map(e => [
    e.description,
    e.category,
    fmtCurr(e.amount),
    fmtDate(e.due_date),
    e.is_paid ? 'Sim' : 'Não',
    fmtDate(e.paid_at),
    e.notes,
  ])
  download(buildCsv(headers, rows), `despesas-${new Date().toISOString().slice(0,10)}.csv`)
}
