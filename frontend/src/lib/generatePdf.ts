// ── Gerador de PDFs para orçamentos e vendas ─────────────────
// Usa jsPDF + jspdf-autotable
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ServiceOrder, Sale, Prescription, Company } from '@/types'

// ── Utilitários ───────────────────────────────────────────────
function fmt(val?: number | null, digits = 2): string {
  if (val == null || isNaN(val)) return '—'
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(digits)}`
}
function fmtCurr(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(iso?: string): string {
  if (!iso) return '—'
  try { return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR }) } catch { return iso }
}
function fmtDateTime(iso?: string): string {
  if (!iso) return '—'
  try { return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) } catch { return iso }
}

type RGB = [number, number, number]
const BRAND:   RGB = [30, 58, 95]    // #1e3a5f
const SLATE:   RGB = [71, 85, 105]   // slate-600
const LIGHT:   RGB = [241, 245, 249] // slate-100
const BLACK:   RGB = [15, 23, 42]    // slate-900
const GREEN:   RGB = [5, 150, 105]   // emerald-600
const DIVIDER: RGB = [203, 213, 225] // slate-300

function header(doc: jsPDF, company: Company, title: string, subtitle?: string) {
  // Barra de topo
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, 210, 22, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(company.name, 12, 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const contact = [company.phone, company.email].filter(Boolean).join('  ·  ')
  if (contact) doc.text(contact, 12, 16)

  // Título da página
  doc.setTextColor(...BLACK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(title, 12, 34)

  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text(subtitle, 12, 40)
  }

  return subtitle ? 45 : 39
}

function divider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.3)
  doc.line(12, y, 198, y)
  return y + 4
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number, labelW = 36): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  doc.text(value, x + labelW, y)
  return y + 5
}

function prescriptionTable(doc: jsPDF, rx: Prescription, startY: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND)
  doc.text('RECEITA ÓPTICA', 12, startY)
  startY += 3

  autoTable(doc, {
    startY,
    margin: { left: 12, right: 12 },
    head: [['', 'OD (Dir.)', 'OE (Esq.)']],
    body: [
      ['Esférico',   fmt(rx.od_esf), fmt(rx.oe_esf)],
      ['Cilíndrico', fmt(rx.od_cil), fmt(rx.oe_cil)],
      ['Eixo',       rx.od_eixo ? `${rx.od_eixo}°` : '—', rx.oe_eixo ? `${rx.oe_eixo}°` : '—'],
      ['Adição',     fmt(rx.od_add), fmt(rx.oe_add)],
      ['DNP',        rx.od_dnp ? `${rx.od_dnp}mm` : '—', rx.oe_dnp ? `${rx.oe_dnp}mm` : '—'],
      ['Altura',     rx.od_altura ? `${rx.od_altura}mm` : '—', rx.oe_altura ? `${rx.oe_altura}mm` : '—'],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: LIGHT, textColor: SLATE, cellWidth: 30 },
      1: { halign: 'center' },
      2: { halign: 'center' },
    },
    alternateRowStyles: { fillColor: [250, 251, 252] },
  })

  return (doc as any).lastAutoTable.finalY + 6
}

// ── Utilitários de Saída ──────────────────────────────────────
function outputDoc(doc: jsPDF, filename: string, mode: 'download' | 'print' = 'download') {
  if (mode === 'print') {
    doc.autoPrint()
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    document.body.appendChild(iframe)
    
    // Pequeno delay para garantir carregamento no iframe
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.print()
      }
      // Remove o iframe após o diálogo de impressão fechar (aproximadamente)
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 500)
  } else {
    doc.save(filename)
  }
}

// ── Funções de Conteúdo (Sem side-effects de output) ──────────
function renderClientContent(doc: jsPDF, order: ServiceOrder | Sale, company: Company, prescription?: Prescription) {
  const isOrder = 'order_number' in order
  const number  = isOrder ? (order as ServiceOrder).order_number : (order as Sale).sale_number
  const name    = (order as any).patient?.full_name ?? (order as Sale).customer_name ?? 'Cliente'
  const phone   = (order as any).patient?.phone ?? ''

  let y = header(doc, company, 'COMPROVANTE DO CLIENTE', `Documento de ${fmtDateTime(order.created_at)}`)
  y = divider(doc, y)

  // Info básica
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.text('DADOS DA VENDA', 12, y); y += 5
  y = labelValue(doc, 'Número:', `#${number}`, 12, y)
  y = labelValue(doc, 'Data:', fmtDate(order.created_at), 12, y)
  y = labelValue(doc, 'Cliente:', name, 12, y)
  if (phone) y = labelValue(doc, 'Telefone:', phone, 12, y)
  if (isOrder && (order as ServiceOrder).estimated_delivery)
    y = labelValue(doc, 'Previsão:', fmtDate((order as ServiceOrder).estimated_delivery), 12, y)
  y = divider(doc, y + 1)

  // Itens
  const items = (order.items ?? []) as any[]
  autoTable(doc, {
    startY: y,
    margin: { left: 12, right: 12 },
    head: [['Descrição', 'Qtd', 'Unit.', 'Total']],
    body: items.map(i => [i.description, i.quantity, fmtCurr(i.unit_price), fmtCurr(i.total_price)]),
    foot: [
      ['', '', 'Subtotal', fmtCurr(items.reduce((s: number, i: any) => s + i.total_price, 0))],
      ...(order.discount_amount > 0 ? [['', '', 'Desconto', `- ${fmtCurr(order.discount_amount)}`]] : []),
      [{ content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold' } }, '', fmtCurr(order.total_amount)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: LIGHT, fontStyle: 'bold', textColor: BLACK },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Pagamento
  if (order.payment_method || order.paid_amount) {
    y = divider(doc, y)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
    doc.text('PAGAMENTO', 12, y); y += 5
    if (order.payment_method) y = labelValue(doc, 'Forma:', order.payment_method.replace(/_/g, ' ').toUpperCase(), 12, y)
    y = labelValue(doc, 'Pago:', fmtCurr(order.paid_amount), 12, y)
    const troco = (order.paid_amount ?? 0) - order.total_amount
    if (troco > 0) y = labelValue(doc, 'Troco:', fmtCurr(troco), 12, y)
  }

  // Prescrição (se óculos de grau)
  if (prescription) {
    y = divider(doc, y + 2)
    y = prescriptionTable(doc, prescription, y)
  }

  // Rodapé
  divider(doc, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.text('Obrigado pela preferência! Guarde este comprovante.', 105, y + 10, { align: 'center' })
  if (company.phone) doc.text(`Dúvidas? Ligue: ${company.phone}`, 105, y + 15, { align: 'center' })
}

function renderLabContent(doc: jsPDF, order: ServiceOrder | Sale, company: Company, prescription?: Prescription) {
  const isOrder = 'order_number' in order
  const number  = isOrder ? (order as ServiceOrder).order_number : (order as Sale).sale_number
  const patient = (order as any).patient
  const name    = patient?.full_name ?? (order as Sale).customer_name ?? '—'
  const phone   = patient?.phone ?? '—'

  let y = header(doc, company, 'ORDEM PARA LABORATÓRIO', `OS: #${number}`)

  // Urgência visual
  doc.setFillColor(...GREEN)
  doc.rect(140, 25, 58, 12, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255)
  doc.text('DATA DE ENTREGA:', 169, 30, { align: 'center' })
  doc.setFontSize(10)
  const delivery = isOrder ? fmtDate((order as ServiceOrder).estimated_delivery) : '—'
  doc.text(delivery, 169, 36, { align: 'center' })
  doc.setTextColor(...BLACK)

  y = divider(doc, y)

  // Dados do pedido
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.text('DADOS DO PEDIDO', 12, y); y += 5
  y = labelValue(doc, 'Nº OS:', `#${number}`, 12, y)
  y = labelValue(doc, 'Data:', fmtDateTime(order.created_at), 12, y)
  y = labelValue(doc, 'Paciente:', name, 12, y)
  y = labelValue(doc, 'Telefone:', phone, 12, y)
  y = divider(doc, y + 1)

  // Receita — obrigatória
  if (prescription) {
    y = prescriptionTable(doc, prescription, y)
    if (prescription.doctor_name) {
      y = labelValue(doc, 'Médico:', prescription.doctor_name, 12, y)
      if (prescription.crm) y = labelValue(doc, 'CRM:', prescription.crm, 12, y)
    }
    y = divider(doc, y + 1)
  } else {
    doc.setFillColor(254, 249, 195)
    doc.rect(12, y, 186, 10, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(180, 120, 0)
    doc.text('⚠  Receita não informada. Verificar com a ótica antes de produzir.', 15, y + 6)
    doc.setTextColor(...BLACK)
    y += 14
  }

  // Itens / especificações
  const items = (order.items ?? []) as any[]
  if (items.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BRAND)
    doc.text('ESPECIFICAÇÕES', 12, y); y += 3
    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      head: [['Item', 'Qtd', 'Descrição']],
      body: items.map((i, idx) => [idx + 1, i.quantity, i.description]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 12, halign: 'center' } },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // Observações
  if (order.notes) {
    y = divider(doc, y)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
    doc.text('OBSERVAÇÕES:', 12, y + 4)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK); doc.setFontSize(9)
    doc.text(order.notes, 12, y + 9, { maxWidth: 186 })
    y += 16
  }

  // Assinatura
  y = Math.max(y, 240)
  divider(doc, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.line(12, y + 14, 90, y + 14)
  doc.line(110, y + 14, 198, y + 14)
  doc.text('Responsável Ótica', 51, y + 18, { align: 'center' })
  doc.text('Responsável Laboratório', 154, y + 18, { align: 'center' })
}

function renderStoreContent(doc: jsPDF, order: ServiceOrder | Sale, company: Company, prescription?: Prescription) {
  const isOrder = 'order_number' in order
  const number  = isOrder ? (order as ServiceOrder).order_number : (order as Sale).sale_number
  const name    = (order as any).patient?.full_name ?? (order as Sale).customer_name ?? '—'

  let y = header(doc, company, 'CONTROLE INTERNO DA ÓTICA', `#${number} — ${fmtDateTime(order.created_at)}`)
  y = divider(doc, y)

  // Cliente + OS
  y = labelValue(doc, 'Cliente:', name, 12, y)
  y = labelValue(doc, 'Telefone:', (order as any).patient?.phone ?? '—', 12, y)
  if (isOrder) {
    const ord = order as ServiceOrder
    y = labelValue(doc, 'Tipo:', ord.service_type.replace(/_/g, ' '), 12, y)
    y = labelValue(doc, 'Status:', ord.status, 12, y)
    if (ord.estimated_delivery) y = labelValue(doc, 'Entrega:', fmtDate(ord.estimated_delivery), 12, y)
  }
  y = divider(doc, y + 1)

  // Itens
  const items = (order.items ?? []) as any[]
  autoTable(doc, {
    startY: y,
    margin: { left: 12, right: 12 },
    head: [['Descrição', 'Qtd', 'Unit.', 'Desc.', 'Total']],
    body: items.map(i => [i.description, i.quantity, fmtCurr(i.unit_price), fmtCurr(i.discount ?? 0), fmtCurr(i.total_price)]),
    foot: [
      ['', '', '', 'Subtotal', fmtCurr(items.reduce((s: number, i: any) => s + i.total_price, 0))],
      ...(order.discount_amount > 0 ? [['', '', '', 'Desconto', `- ${fmtCurr(order.discount_amount)}`]] : []),
      [{ content: 'TOTAL FINAL', colSpan: 3, styles: { fontStyle: 'bold' } }, '', fmtCurr(order.total_amount)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
    footStyles: { fillColor: LIGHT, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Pagamento
  y = divider(doc, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.text('FINANCEIRO', 12, y); y += 5
  y = labelValue(doc, 'Forma:', order.payment_method ? order.payment_method.replace(/_/g, ' ').toUpperCase() : '—', 12, y)
  y = labelValue(doc, 'Recebido:', fmtCurr(order.paid_amount ?? 0), 12, y)
  const saldo = (order.total_amount ?? 0) - (order.paid_amount ?? 0)
  if (saldo > 0) y = labelValue(doc, 'Saldo:', fmtCurr(saldo), 12, y)

  // Receita
  if (prescription) {
    y = divider(doc, y + 1)
    y = prescriptionTable(doc, prescription, y)
  }

  // Notas
  if (order.notes) {
    y = divider(doc, y)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
    doc.text('OBSERVAÇÕES:', 12, y + 4)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK); doc.setFontSize(9)
    doc.text(order.notes, 12, y + 9, { maxWidth: 186 })
    y += 16
  }

  // Assinaturas
  y = Math.max(y + 6, 250)
  divider(doc, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.line(12, y + 14, 90, y + 14)
  doc.line(110, y + 14, 198, y + 14)
  doc.text('Assinatura do Cliente', 51, y + 18, { align: 'center' })
  doc.text('Responsável Atendimento', 154, y + 18, { align: 'center' })
}

// ── Exportações Públicas ──────────────────────────────────────

export async function downloadClientPdf(
  order: ServiceOrder | Sale,
  company: Company,
  prescription?: Prescription,
  mode: 'download' | 'print' = 'download',
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const isOrder = 'order_number' in order
  const number  = isOrder ? (order as ServiceOrder).order_number : (order as Sale).sale_number
  
  renderClientContent(doc, order, company, prescription)
  outputDoc(doc, `${number}-cliente.pdf`, mode)
}

export async function downloadLabPdf(
  order: ServiceOrder | Sale,
  company: Company,
  prescription?: Prescription,
  mode: 'download' | 'print' = 'download',
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const isOrder = 'order_number' in order
  const number  = isOrder ? (order as ServiceOrder).order_number : (order as Sale).sale_number
  
  renderLabContent(doc, order, company, prescription)
  outputDoc(doc, `${number}-laboratorio.pdf`, mode)
}

export async function downloadStorePdf(
  order: ServiceOrder | Sale,
  company: Company,
  prescription?: Prescription,
  mode: 'download' | 'print' = 'download',
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const isOrder = 'order_number' in order
  const number  = isOrder ? (order as ServiceOrder).order_number : (order as Sale).sale_number
  
  renderStoreContent(doc, order, company, prescription)
  outputDoc(doc, `${number}-otica.pdf`, mode)
}

export async function downloadAllPdfs(
  order: ServiceOrder | Sale,
  company: Company,
  prescription?: Prescription,
  mode: 'download' | 'print' = 'download',
) {
  const isOrder = 'order_number' in order
  const number  = isOrder ? (order as ServiceOrder).order_number : (order as Sale).sale_number

  if (mode === 'print') {
    // Para impressão, combinamos tudo em um único PDF (páginas diferentes)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    renderClientContent(doc, order, company, prescription)
    doc.addPage()
    renderLabContent(doc, order, company, prescription)
    doc.addPage()
    renderStoreContent(doc, order, company, prescription)
    outputDoc(doc, `${number}-completo.pdf`, 'print')
  } else {
    // Para download, mantemos os arquivos separados como antes
    await downloadClientPdf(order, company, prescription, 'download')
    await new Promise(r => setTimeout(r, 400))
    await downloadLabPdf(order, company, prescription, 'download')
    await new Promise(r => setTimeout(r, 400))
    await downloadStorePdf(order, company, prescription, 'download')
  }
}

export function downloadWarrantyPdf(sale: Sale, company: Company) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const number = sale.sale_number
  const name   = (sale as any).patient?.full_name ?? sale.customer_name ?? 'Cliente'
  const warrantyMonths = 12

  let y = header(doc, company, 'CERTIFICADO DE GARANTIA', `Venda #${number}`)
  y = divider(doc, y)

  // Caixa de destaque
  doc.setFillColor(240, 249, 255)
  doc.setDrawColor(...BRAND)
  doc.setLineWidth(0.5)
  doc.roundedRect(12, y, 186, 24, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...BRAND)
  doc.text(`GARANTIA DE ${warrantyMonths} MESES`, 105, y + 10, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  const expiry = new Date(sale.created_at)
  expiry.setMonth(expiry.getMonth() + warrantyMonths)
  doc.text(`Válida até: ${fmtDate(expiry.toISOString())}`, 105, y + 18, { align: 'center' })
  y += 30

  // Dados do cliente e venda
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.text('DADOS DO CLIENTE', 12, y); y += 5
  doc.setTextColor(...BLACK)
  y = labelValue(doc, 'Cliente:', name, 12, y)
  y = labelValue(doc, 'Data Compra:', fmtDate(sale.created_at), 12, y)
  y = labelValue(doc, 'Nº Venda:', `#${number}`, 12, y)
  y = divider(doc, y + 1)

  // Itens
  const items = (sale.items ?? []) as any[]
  if (items.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
    doc.text('PRODUTOS COBERTOS', 12, y); y += 4
    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      head: [['Produto', 'Qtd']],
      body: items.map(i => [i.description, i.quantity]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'center', cellWidth: 20 } },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // Termos
  y = divider(doc, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.text('CONDIÇÕES DA GARANTIA', 12, y); y += 5
  const terms = [
    `A garantia cobre defeitos de fabricação pelos ${warrantyMonths} meses a partir da data de compra.`,
    'Não cobre danos causados por mau uso, quedas, umidade ou uso indevido.',
    'Para acionar a garantia, apresente este certificado junto ao produto.',
    'O prazo de reparo ou substituição é de até 30 dias após a verificação do defeito.',
  ]
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...SLATE); doc.setFontSize(8)
  for (const term of terms) {
    doc.text(`• ${term}`, 15, y, { maxWidth: 180 })
    y += 6
  }

  // Assinaturas
  y = Math.max(y + 10, 240)
  divider(doc, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  doc.line(12, y + 14, 90, y + 14)
  doc.line(110, y + 14, 198, y + 14)
  doc.text('Assinatura do Cliente', 51, y + 18, { align: 'center' })
  doc.text(`${company.name}`, 154, y + 18, { align: 'center' })

  outputDoc(doc, `garantia-${number}.pdf`, 'download')
}
