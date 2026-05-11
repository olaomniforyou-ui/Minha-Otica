import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Plus, Trash2, CreditCard, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { PatientSelect } from '@/components/ui/PatientSelect'
import { PatientModal } from '@/components/patients/PatientModal'
import { PrescriptionFields } from '@/components/sales/PrescriptionFields'
import { ProductRecommendations } from '@/components/sales/ProductRecommendations'
import { createOrder } from '@/services/orders.service'
import { getPatients } from '@/services/patients.service'
import { getProducts } from '@/services/products.service'
import { getEmployees } from '@/services/employees.service'
import { generateId, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { db, enqueue } from '@/db'
import { useAuthStore } from '@/store/authStore'
import type {
  Patient, Product, Profile, PaymentMethod, PaymentEntry,
  ServiceType, ServiceOrderFormData, Prescription,
  PrescriptionFormData,
} from '@/types'
import { SERVICE_TYPE_LABELS, PAYMENT_LABELS } from '@/types'

interface OrderModalProps {
  open:    boolean
  onClose: () => void
  onSaved: () => void
}

type ItemRow = {
  _key: number; product_id: string; description: string
  quantity: number; unit_price: number; total_price: number
}

const PAYMENT_OPTIONS = (Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map(v => ({
  value: v, label: PAYMENT_LABELS[v],
}))

let _key = 0
const newRow = (): ItemRow => ({
  _key: ++_key, product_id: '', description: '', quantity: 1, unit_price: 0, total_price: 0,
})

let _pkey = 0
const newPayment = (): PaymentEntry & { _key: number } => ({
  _key: ++_pkey, method: 'dinheiro', amount: 0,
})

type PaymentRow = PaymentEntry & { _key: number }

export function OrderModal({ open, onClose, onSaved }: OrderModalProps) {
  const [items,            setItems]            = useState<ItemRow[]>([newRow()])
  const [patients,         setPatients]         = useState<Patient[]>([])
  const [products,         setProducts]         = useState<Product[]>([])
  const [employees,        setEmployees]         = useState<Profile[]>([])
  const [patientId,        setPatientId]        = useState('')
  const [sellerId,         setSellerId]         = useState('')
  const [serviceType,      setServiceType]      = useState<ServiceType | ''>('')
  const [estimatedDate,    setEstimatedDate]    = useState('')
  const [discountAmount,   setDiscountAmount]   = useState(0)
  const [payments,         setPayments]         = useState<PaymentRow[]>([])
  const [notes,            setNotes]            = useState('')
  const [prescription,     setPrescription]     = useState<Partial<PrescriptionFormData>>({})
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  const isGrau = serviceType === 'oculos_grau'

  const loadData = useCallback(() => {
    const currentProfile = useAuthStore.getState().profile
    Promise.all([getPatients(), getProducts(), getEmployees()]).then(([p, pr, e]) => {
      setPatients(p); setProducts(pr); setEmployees(e)
      // Pré-seleciona o usuário logado como vendedor
      if (currentProfile && e.find((emp: Profile) => emp.id === currentProfile.id)) {
        setSellerId(id => id || currentProfile.id)
      }
    })
  }, [])

  useEffect(() => {
    if (!open) return
    loadData()
    setItems([newRow()]); setPatientId(''); setSellerId(''); setServiceType('')
    setEstimatedDate(''); setDiscountAmount(0); setPayments([])
    setNotes(''); setPrescription({}); setError(null)
  }, [open, loadData])

  const subtotal   = items.reduce((s, r) => s + r.total_price, 0)
  const total      = Math.max(0, subtotal - discountAmount)
  const totalPaid  = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const remaining  = total - totalPaid

  // Items
  function addRow() { setItems(p => [...p, newRow()]) }
  function removeRow(k: number) { setItems(p => p.filter(r => r._key !== k)) }
  function updateRow(k: number, patch: Partial<ItemRow>) {
    setItems(p => p.map(r => {
      if (r._key !== k) return r
      const u = { ...r, ...patch }
      return { ...u, total_price: u.unit_price * u.quantity }
    }))
  }
  function handleProductSelect(k: number, pid: string) {
    const p = products.find(pr => pr.id === pid)
    updateRow(k, { product_id: pid, description: p?.name ?? '', unit_price: p?.sale_price ?? 0 })
  }
  function handleAddRecommendation(product: Product) {
    setItems(prev => {
      const existing = prev.find(r => r.product_id === product.id)
      if (existing) {
        return prev.map(r =>
          r.product_id === product.id
            ? { ...r, quantity: r.quantity + 1, total_price: (r.quantity + 1) * r.unit_price }
            : r
        )
      }
      const row = newRow()
      return [...prev, { ...row, product_id: product.id, description: product.name, unit_price: product.sale_price, total_price: product.sale_price }]
    })
  }

  // Payments
  function addPayment() {
    setPayments(prev => {
      const row = newPayment()
      // Preenche automaticamente com o saldo restante
      const paid = prev.reduce((s, p) => s + (p.amount || 0), 0)
      const rest = Math.max(0, total - paid)
      return [...prev, { ...row, amount: rest }]
    })
  }
  function removePayment(k: number) { setPayments(p => p.filter(r => r._key !== k)) }
  function updatePayment(k: number, patch: Partial<PaymentRow>) {
    setPayments(p => p.map(r => r._key === k ? { ...r, ...patch } : r))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!patientId)   { setError('Selecione um paciente.'); return }
    if (!serviceType) { setError('Selecione o tipo de serviço.'); return }
    setLoading(true); setError(null)
    try {
      const profile    = useAuthStore.getState().profile
      const company_id = useAuthStore.getState().company?.id ?? ''
      const now        = new Date().toISOString()

      // Receita
      let prescription_id: string | undefined
      if (isGrau) {
        const rxRecord: Prescription = {
          id: generateId(), company_id, patient_id: patientId,
          od_esf: prescription.od_esf, od_cil: prescription.od_cil,
          od_eixo: prescription.od_eixo, od_add: prescription.od_add,
          od_dnp: prescription.od_dnp, od_altura: prescription.od_altura,
          oe_esf: prescription.oe_esf, oe_cil: prescription.oe_cil,
          oe_eixo: prescription.oe_eixo, oe_add: prescription.oe_add,
          oe_dnp: prescription.oe_dnp, oe_altura: prescription.oe_altura,
          doctor_name: prescription.doctor_name, crm: prescription.crm,
          exam_date: prescription.exam_date,
          created_by: profile?.id, created_at: now,
        }
        await db.prescriptions.add(rxRecord)
        await enqueue('prescriptions', 'insert', rxRecord.id, rxRecord as unknown as Record<string, unknown>)
        if (navigator.onLine) { try { await supabase.from('prescriptions').insert(rxRecord) } catch {} }
        prescription_id = rxRecord.id
      }

      const validPayments: PaymentEntry[] = payments
        .filter(p => p.amount > 0)
        .map(({ _key: _k, ...p }) => p)

      const data: ServiceOrderFormData = {
        patient_id:         patientId,
        seller_id:          sellerId || undefined,
        prescription_id,
        service_type:       serviceType as ServiceType,
        status:             'orcamento',
        total_amount:       total,
        discount_amount:    discountAmount,
        paid_amount:        totalPaid,
        payment_method:     validPayments[0]?.method,
        payments:           validPayments.length > 0 ? validPayments : undefined,
        estimated_delivery: estimatedDate || undefined,
        delivered_at:       undefined,
        notes:              notes.trim() || undefined,
        created_by:         undefined,
      }
      const order = await createOrder(data)

      // Itens
      const validItems = items.filter(r => r.description.trim())
      const orderItems = validItems.map(r => ({
        id: generateId(), service_order_id: order.id,
        product_id: r.product_id || undefined, description: r.description,
        quantity: r.quantity, unit_price: r.unit_price, total_price: r.total_price,
      }))
      for (const item of orderItems) {
        await db.service_order_items.add(item)
        await enqueue('service_order_items', 'insert', item.id, item as unknown as Record<string, unknown>)
      }
      if (navigator.onLine) { try { await supabase.from('service_order_items').insert(orderItems) } catch {} }

      onSaved(); onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar orçamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Modal
        open={open} onClose={onClose}
        title="Novo Orçamento" subtitle="Cria uma OS que passará pelo fluxo de produção"
        size="2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col text-sm">
              <span className="text-slate-500">Total: <span className="font-bold text-slate-900 text-base">{formatCurrency(total)}</span></span>
              {payments.length > 0 && (
                <span className={remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                  {remaining > 0
                    ? `Restante: ${formatCurrency(remaining)}`
                    : `Pago: ${formatCurrency(totalPaid)}`}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button form="order-form" type="submit" loading={loading}>Criar Orçamento</Button>
            </div>
          </div>
        }
      >
        <form id="order-form" onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Tipo + Paciente + Vendedor */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="Tipo de Serviço" required
              value={serviceType}
              onChange={e => setServiceType(e.target.value as ServiceType)}
              placeholder="Selecione..."
              options={Object.entries(SERVICE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            <PatientSelect
              label="Paciente" required
              patients={patients}
              value={patientId}
              onChange={setPatientId}
              onNew={() => setShowPatientModal(true)}
            />
            <Select
              label="Vendedor"
              value={sellerId}
              onChange={e => setSellerId(e.target.value)}
              placeholder="Selecione o vendedor"
              options={employees.map(e => ({ value: e.id, label: e.full_name }))}
            />
          </div>

          {/* Receita — só para óculos de grau */}
          {isGrau && (
            <>
              <PrescriptionFields value={prescription} onChange={p => setPrescription(prev => ({ ...prev, ...p }))} />
              <ProductRecommendations prescription={prescription} products={products} onAdd={handleAddRecommendation} />
            </>
          )}

          {/* Itens */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Itens / Produtos</span>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-900">
                <Plus size={13} /> Adicionar item
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-40">Produto</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Descrição</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-16">Qtd</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-28">Preço Unit.</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-24">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row) => (
                    <tr key={row._key}>
                      <td className="px-2 py-1.5">
                        <select value={row.product_id} onChange={e => handleProductSelect(row._key, e.target.value)}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
                          <option value="">— Produto —</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.description} onChange={e => updateRow(row._key, { description: e.target.value })}
                          placeholder="Descrição do item"
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="1" value={row.quantity}
                          onChange={e => updateRow(row._key, { quantity: Number(e.target.value) || 1 })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" step="0.01" value={row.unit_price}
                          onChange={e => updateRow(row._key, { unit_price: Number(e.target.value) || 0 })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-500" />
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-slate-800">{formatCurrency(row.total_price)}</td>
                      <td className="px-1 py-1.5">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeRow(row._key)}
                            className="rounded p-1 text-slate-300 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/60">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-xs font-medium text-slate-500">Subtotal</td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-slate-800">{formatCurrency(subtotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Desconto + Entrega */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Desconto (R$)" type="number" min="0" step="0.01"
              value={String(discountAmount)} onChange={e => setDiscountAmount(Number(e.target.value) || 0)} />
            <Input label="Previsão de Entrega" type="date"
              value={estimatedDate} onChange={e => setEstimatedDate(e.target.value)} />
          </div>

          {/* Pagamentos */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">Pagamento</span>
              </div>
              <button type="button" onClick={addPayment}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-900">
                <Plus size={13} /> Adicionar forma
              </button>
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">
                Nenhum pagamento registrado — clique em "Adicionar forma" para registrar entrada ou sinal.
              </p>
            ) : (
              <div className="space-y-2">
                {payments.map((row) => (
                  <div key={row._key} className="flex items-center gap-2">
                    <select
                      value={row.method}
                      onChange={e => updatePayment(row._key, { method: e.target.value as PaymentMethod })}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={row.amount || ''}
                        onChange={e => updatePayment(row._key, { amount: Number(e.target.value) || 0 })}
                        placeholder="0,00"
                        className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <button type="button" onClick={() => removePayment(row._key)}
                      className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Resumo de pagamentos */}
            {payments.length > 0 && (
              <div className="border-t border-slate-200 pt-3 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total do orçamento</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total pago / sinal</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className={remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                    {remaining > 0 ? 'Restante a pagar' : 'Pago integralmente'}
                  </span>
                  <span className={remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                    {remaining > 0 ? formatCurrency(remaining) : '✓'}
                  </span>
                </div>
                {remaining < 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                    <AlertCircle size={12} />
                    Valor pago excede o total por {formatCurrency(-remaining)}
                  </div>
                )}
              </div>
            )}
          </div>

          <Textarea label="Observações" rows={2} value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Detalhes do pedido, lentes, armação, instruções especiais..." />
        </form>
      </Modal>

      <PatientModal
        open={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        onSuccess={(p) => { loadData(); setPatientId(p.id) }}
      />
    </>
  )
}
