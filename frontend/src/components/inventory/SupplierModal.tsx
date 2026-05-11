import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { createSupplier, updateSupplier } from '@/services/suppliers.service'
import type { Supplier } from '@/types'

interface SupplierModalProps {
  open:      boolean
  onClose:   () => void
  supplier?: Supplier | null
  onSaved:   () => void
}

const empty = {
  name: '', cnpj: '', phone: '', whatsapp: '',
  email: '', contact_name: '', notes: '',
}

function maskCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskPhone(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export function SupplierModal({ open, onClose, supplier, onSaved }: SupplierModalProps) {
  const [form,    setForm]    = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(
      supplier
        ? {
            name:         supplier.name,
            cnpj:         supplier.cnpj ?? '',
            phone:        supplier.phone ?? '',
            whatsapp:     supplier.whatsapp ?? '',
            email:        supplier.email ?? '',
            contact_name: supplier.contact_name ?? '',
            notes:        supplier.notes ?? '',
          }
        : empty,
    )
    setError(null)
  }, [open, supplier])

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = {
        ...form,
        cnpj:     form.cnpj.replace(/\D/g, '') || undefined,
        phone:    form.phone.replace(/\D/g, '') || undefined,
        whatsapp: form.whatsapp.replace(/\D/g, '') || undefined,
        is_active: true,
      }
      if (supplier) {
        await updateSupplier(supplier.id, data)
      } else {
        await createSupplier(data)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="supplier-form" type="submit" loading={loading}>
            {supplier ? 'Salvar alterações' : 'Cadastrar fornecedor'}
          </Button>
        </div>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <Input label="Nome / Razão Social" required value={form.name}
          onChange={e => set('name', e.target.value)} placeholder="Ex: Ótica Distribuidora Brasil Ltda" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="CNPJ" value={form.cnpj} inputMode="numeric"
            onChange={e => set('cnpj', maskCNPJ(e.target.value))}
            placeholder="00.000.000/0001-00" />
          <Input label="Nome do Contato" value={form.contact_name}
            onChange={e => set('contact_name', e.target.value)}
            placeholder="Nome do representante" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Telefone" value={form.phone} inputMode="tel"
            onChange={e => set('phone', maskPhone(e.target.value))}
            placeholder="(00) 00000-0000" />
          <Input label="WhatsApp" value={form.whatsapp} inputMode="tel"
            onChange={e => set('whatsapp', maskPhone(e.target.value))}
            placeholder="(00) 00000-0000" />
        </div>

        <Input label="E-mail" type="email" value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="contato@fornecedor.com" />

        <Textarea label="Observações" rows={3} value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Condições de pagamento, prazo de entrega..." />
      </form>
    </Modal>
  )
}
