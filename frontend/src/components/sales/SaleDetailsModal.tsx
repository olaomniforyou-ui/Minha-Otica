import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PAYMENT_LABELS } from '@/types'
import type { Sale } from '@/types'
import { Printer, MessageCircle } from 'lucide-react'

interface SaleDetailsModalProps {
  open: boolean
  onClose: () => void
  sale: Sale | null
  onPrint: () => void
  onWhatsApp: () => void
}

export function SaleDetailsModal({ open, onClose, sale, onPrint, onWhatsApp }: SaleDetailsModalProps) {
  if (!sale) return null

  const name = sale.patient?.full_name ?? sale.customer_name ?? 'Cliente avulso'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detalhes da Venda #${sale.sale_number}`}
      size="xl"
    >
      <div className="space-y-6 py-2">
        {/* Info Cabeçalho */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cliente</p>
            <p className="text-sm font-medium text-slate-900">{name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Data e Hora</p>
            <p className="text-sm font-medium text-slate-900">{formatDateTime(sale.created_at)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Forma de Pagamento</p>
            <p className="text-sm font-medium text-slate-900">
              {sale.payment_method ? PAYMENT_LABELS[sale.payment_method] : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
            <div className="flex items-center gap-1.5 text-sm font-medium text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-600" />
              Finalizada
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vendedor</p>
            <p className="text-sm font-medium text-slate-900">{sale.seller?.full_name || '—'}</p>
          </div>
        </div>

        {/* Itens */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Item</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600 w-16">Qtd</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">Unit.</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-slate-800">{item.description}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/50 font-semibold">
              {sale.discount_amount > 0 && (
                <tr className="text-slate-600">
                  <td colSpan={3} className="px-3 py-1.5 text-right">Desconto</td>
                  <td className="px-3 py-1.5 text-right">- {formatCurrency(sale.discount_amount)}</td>
                </tr>
              )}
              <tr className="text-slate-900 text-base">
                <td colSpan={3} className="px-3 py-2 text-right">Total Final</td>
                <td className="px-3 py-2 text-right">{formatCurrency(sale.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Observações */}
        {sale.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Observações</p>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
              "{sale.notes}"
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" className="gap-2" onClick={onPrint}>
            <Printer size={16} /> Imprimir PDF
          </Button>
          <Button variant="outline" className="gap-2 text-green-600 hover:text-green-700" onClick={onWhatsApp}>
            <MessageCircle size={16} /> WhatsApp
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </Modal>
  )
}
