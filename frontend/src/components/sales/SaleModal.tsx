import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Plus, Trash2, Package, CheckCircle2, Printer, FileText, ShieldCheck, Receipt, MessageCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { createSale, updateSale } from '@/services/sales.service'
import { getPatients } from '@/services/patients.service'
import { getProducts } from '@/services/products.service'
import { getEmployees } from '@/services/employees.service'
import { PatientModal } from '@/components/patients/PatientModal'
import { PatientSelect } from '@/components/ui/PatientSelect'
import { PrescriptionFields } from './PrescriptionFields'
import { ProductRecommendations } from './ProductRecommendations'
import { formatCurrency } from '@/lib/utils'
import type { Patient, Product, PaymentMethod, SaleItemFormData, Sale, Profile, ServiceType, PrescriptionFormData } from '@/types'
import { SERVICE_TYPE_LABELS } from '@/types'

interface SaleModalProps {
  open:    boolean
  onClose: () => void
  onSaved: () => void
  sale?:   Sale
}

type ItemRow = SaleItemFormData & { _key: number }

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro',       label: 'Dinheiro' },
  { value: 'pix',            label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito',  label: 'Cartão de Débito' },
  { value: 'boleto',         label: 'Boleto' },
  { value: 'convenio',       label: 'Convênio' },
  { value: 'outro',          label: 'Outro' },
]

let _key = 0
const newRow = (): ItemRow => ({
  _key:        ++_key,
  product_id:  '',
  description: '',
  quantity:    1,
  unit_price:  0,
  discount:    0,
  total_price: 0,
})

function calcRow(row: ItemRow): ItemRow {
  const total = Math.max(0, row.unit_price * row.quantity - row.discount)
  return { ...row, total_price: total }
}

import { downloadClientPdf, downloadAllPdfs } from '@/lib/generatePdf'
import { useAuthStore } from '@/store/authStore'
import { PrintOptionsModal } from './PrintOptionsModal'

export function SaleModal({ open, onClose, onSaved, sale }: SaleModalProps) {
  const [items,           setItems]           = useState<ItemRow[]>([newRow()])
  const [patients,        setPatients]        = useState<Patient[]>([])
  const [products,        setProducts]        = useState<Product[]>([])
  const [patientId,       setPatientId]       = useState('')
  const [discountAmount,  setDiscountAmount]  = useState(0)
  const [paidAmount,      setPaidAmount]      = useState(0)
  const [paymentMethod,   setPaymentMethod]   = useState<PaymentMethod | ''>('')
  const [notes,           setNotes]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [completedSale,   setCompletedSale]   = useState<Sale | null>(null)
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  const [employees,       setEmployees]       = useState<Profile[]>([])
  const [sellerId,        setSellerId]        = useState('')
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [saleType,        setSaleType]        = useState<ServiceType | ''>('')
  const [prescription,    setPrescription]    = useState<Partial<PrescriptionFormData>>({})
  const isGrau = saleType === 'oculos_grau'

  const loadData = useCallback(() => {
    const currentProfile = useAuthStore.getState().profile
    Promise.all([getPatients(), getProducts(), getEmployees()]).then(([p, pr, e]) => {
      setPatients(p)
      setProducts(pr)
      setEmployees(e)
      // Pré-seleciona o usuário logado como vendedor (apenas em nova venda)
      if (!sale && currentProfile && e.find((emp: Profile) => emp.id === currentProfile.id)) {
        setSellerId(id => id || currentProfile.id)
      }
    })
  }, [sale])

  useEffect(() => {
    if (!open) return
    loadData()

    if (sale) {
      setItems(sale.items?.map(i => ({ ...i, _key: ++_key })) || [newRow()])
      setPatientId(sale.patient_id || '')
      setSellerId(sale.seller_id || '')
      setDiscountAmount(sale.discount_amount)
      setPaidAmount(sale.paid_amount)
      setPaymentMethod(sale.payment_method || '')
      setNotes(sale.notes || '')
      setSaleType(sale.sale_type || '')
      setPrescription(sale.prescription ?? {})
    } else {
      setItems([newRow()])
      setPatientId('')
      setSellerId('')
      setDiscountAmount(0)
      setPaidAmount(0)
      setPaymentMethod('')
      setNotes('')
      setSaleType('')
      setPrescription({})
    }
    setError(null)
    setCompletedSale(null)
    setShowPrintOptions(false)
  }, [open, sale])

  // Subtotal dos itens
  const subtotal = items.reduce((s, r) => s + r.total_price, 0)
  const total    = Math.max(0, subtotal - discountAmount)

  function addRow() {
    setItems(prev => [...prev, newRow()])
  }

  function removeRow(key: number) {
    setItems(prev => prev.filter(r => r._key !== key))
  }

  function updateRow(key: number, patch: Partial<ItemRow>) {
    setItems(prev =>
      prev.map(r => r._key === key ? calcRow({ ...r, ...patch }) : r),
    )
  }

  function handleProductSelect(key: number, productId: string) {
    const p = products.find(pr => pr.id === productId)
    updateRow(key, {
      product_id:  productId,
      description: p?.name ?? '',
      unit_price:  p?.sale_price ?? 0,
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (items.every(r => !r.description.trim())) {
      setError('Adicione pelo menos um item.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const formData = {
        patient_id:     patientId,
        seller_id:      sellerId || undefined,
        sale_type:      saleType as ServiceType || undefined,
        prescription:   isGrau ? prescription as PrescriptionFormData : undefined,
        total_amount:   total,
        discount_amount: discountAmount,
        paid_amount:    paidAmount || total,
        payment_method: paymentMethod as PaymentMethod || undefined,
        notes:          notes.trim() || undefined,
        items:          items
          .filter(r => r.description.trim())
          .map(({ _key: _k, ...rest }) => rest),
      }

      if (sale) {
        await updateSale(sale.id, formData)
        onSaved()
        onClose()
      } else {
        const newSale = await createSale(formData)
        setCompletedSale(newSale)
        onSaved()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar venda.')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsApp = () => {
    if (!completedSale) return
    const patient = patients.find(p => p.id === completedSale.patient_id)
    const phone = patient?.whatsapp || patient?.phone || ''
    const name = patient?.full_name || 'Cliente'
    const amount = formatCurrency(completedSale.total_amount)
    
    const text = `Olá ${name}, tudo bem? A Minha Ótica agradece a sua preferência! Sua compra no valor de ${amount} foi finalizada com sucesso. Qualquer dúvida estamos à disposição!`
    const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handlePrint = (type: 'pdf' | 'nf' | 'garantia' | 'comprovante', options?: { copies: number }) => {
    if (type === 'pdf' && !options) {
      setShowPrintOptions(true)
      return
    }

    if (type === 'pdf' && options && completedSale) {
      const company = useAuthStore.getState().company
      if (!company) return
      
      if (options.copies === 1) {
        downloadClientPdf(completedSale, company, undefined, 'print')
      } else {
        downloadAllPdfs(completedSale, company, undefined, 'print')
      }
      setShowPrintOptions(false)
      return
    }

    // Placeholder para as outras ações
    alert(`Gerando ${type}... Funcionalidade em desenvolvimento.`)
    setShowPrintOptions(false)
  }

  if (completedSale) {
    return (
      <>
        <Modal
          open={open}
          onClose={onClose}
          title="Venda Finalizada"
          size="md"
        >
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 rounded-full bg-green-100 p-3 text-green-600">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Venda realizada com sucesso!</h3>
            <p className="mt-1 text-sm text-slate-500">
              Venda #{completedSale.sale_number} — Total: {formatCurrency(completedSale.total_amount)}
            </p>

            <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2"
                onClick={() => handlePrint('pdf')}
              >
                <Printer size={18} /> Imprimir PDF
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2"
                onClick={() => handlePrint('nf')}
              >
                <FileText size={18} /> Nota Fiscal
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2"
                onClick={() => handlePrint('garantia')}
              >
                <ShieldCheck size={18} /> Garantia
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2"
                onClick={() => handlePrint('comprovante')}
              >
                <Receipt size={18} /> Comprovante
              </Button>
              <Button
                variant="primary"
                className="col-span-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 sm:col-span-2"
                onClick={handleWhatsApp}
              >
                <MessageCircle size={18} /> Pós Venda (WhatsApp)
              </Button>
            </div>

            <div className="mt-8 w-full border-t border-slate-100 pt-6">
              <Button variant="ghost" onClick={onClose} className="w-full">
                Fechar e Voltar
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de Opções de Impressão */}
        <PrintOptionsModal
          open={showPrintOptions}
          onClose={() => setShowPrintOptions(false)}
          onSelect={(copies) => handlePrint('pdf', { copies })}
        />
      </>
    )
  }

  return (
    <>
      <Modal
      open={open}
      onClose={onClose}
      title={sale ? "Editar Venda" : "Nova Venda"}
      subtitle={sale ? `Editando venda #${sale.sale_number}` : "Venda direta — pagamento imediato"}
      size="2xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Total: <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button form="sale-form" type="submit" loading={loading}>Finalizar Venda</Button>
          </div>
        </div>
      }
    >
      <form id="sale-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Tipo de Venda + Cliente + Vendedor */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Tipo de Venda"
            value={saleType}
            onChange={e => setSaleType(e.target.value as ServiceType | '')}
            placeholder="Selecione..."
            options={Object.entries(SERVICE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
          <PatientSelect
            label="Paciente"
            required
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
            required
          />
        </div>

        {/* Receita — só aparece para óculos de grau */}
        {isGrau && (
          <PrescriptionFields
            value={prescription}
            onChange={patch => setPrescription(prev => ({ ...prev, ...patch }))}
          />
        )}

        {/* Recomendações de produtos */}
        {isGrau && (
          <ProductRecommendations
            prescription={prescription}
            products={products}
            onAdd={p => {
              const existing = items.find(r => r.product_id === p.id)
              if (existing) {
                updateRow(existing._key, { quantity: existing.quantity + 1 })
              } else {
                setItems(prev => [
                  ...prev,
                  calcRow({
                    _key:        ++_key,
                    product_id:  p.id,
                    description: p.name,
                    quantity:    1,
                    unit_price:  p.sale_price,
                    discount:    0,
                    total_price: 0,
                  }),
                ])
              }
            }}
          />
        )}

        {/* Itens */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Itens</span>
            <button type="button" onClick={addRow}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-900">
              <Plus size={13} /> Adicionar item
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-48">Produto</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Descrição</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-16">Qtd</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-28">Preço Unit.</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-24">Desc. item</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-24">Subtotal</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row._key}>
                    <td className="px-2 py-1.5">
                      <select
                        value={row.product_id}
                        onChange={e => handleProductSelect(row._key, e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">— Selecione —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.description}
                        onChange={e => updateRow(row._key, { description: e.target.value })}
                        placeholder="Descrição"
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="1" value={row.quantity}
                        onChange={e => updateRow(row._key, { quantity: Number(e.target.value) || 1 })}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.01" value={row.unit_price}
                        onChange={e => updateRow(row._key, { unit_price: Number(e.target.value) || 0 })}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.01" value={row.discount}
                        onChange={e => updateRow(row._key, { discount: Number(e.target.value) || 0 })}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-slate-800">
                      {formatCurrency(row.total_price)}
                    </td>
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
                  <td colSpan={5} className="px-3 py-2 text-right text-xs font-medium text-slate-500">Subtotal</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-slate-800">{formatCurrency(subtotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pagamento */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Forma de Pagamento"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
            placeholder="Selecione..."
            options={PAYMENT_OPTIONS}
          />
          <Input
            label="Desconto geral (R$)" type="number" min="0" step="0.01"
            value={String(discountAmount)}
            onChange={e => setDiscountAmount(Number(e.target.value) || 0)}
          />
          <Input
            label="Valor recebido (R$)" type="number" min="0" step="0.01"
            value={String(paidAmount || total)}
            onChange={e => setPaidAmount(Number(e.target.value) || 0)}
            hint={paidAmount > total ? `Troco: ${formatCurrency(paidAmount - total)}` : undefined}
          />
        </div>

        <Textarea
          label="Observações"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Informações adicionais..."
        />

        {/* Itens vazios — aviso */}
        {items.every(r => !r.product_id && !r.description) && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <Package size={15} />
            Selecione ou descreva pelo menos um item.
          </div>
        )}
      </form>
      </Modal>

      <PatientModal 
        open={showPatientModal} 
        onClose={() => setShowPatientModal(false)}
        onSuccess={(p) => {
          loadData()
          setPatientId(p.id)
        }}
      />
    </>
  )
}
