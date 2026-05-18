import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart, TrendingUp, Receipt, Plus, FileText, Download,
  MessageCircle, FileCheck, MoreVertical, Eye, Edit2, Trash2, ShieldCheck, QrCode
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { SaleModal } from '@/components/sales/SaleModal'
import { SaleDetailsModal } from '@/components/sales/SaleDetailsModal'
import { Modal } from '@/components/ui/Modal'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { getSales, getTodayStats, deleteSale } from '@/services/sales.service'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDateTime, getInitials, cn } from '@/lib/utils'
import { PAYMENT_LABELS } from '@/types'
import type { Sale } from '@/types'

const COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-cyan-500']
const colorOf = (name: string) =>
  COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]

interface PixSettings { keyType: string; keyValue: string; receiverName: string; city: string }
const PIX_SETTINGS_KEY = 'pix_settings_v1'
function loadPixSettings(): PixSettings | null {
  try { return JSON.parse(localStorage.getItem(PIX_SETTINGS_KEY) ?? 'null') } catch { return null }
}

import { PrintOptionsModal } from '@/components/sales/PrintOptionsModal'
import { downloadClientPdf, downloadAllPdfs, downloadWarrantyPdf } from '@/lib/generatePdf'
import { exportSalesCsv } from '@/lib/exportCsv'

export default function SalesPage() {
  const [sales,   setSales]   = useState<Sale[]>([])
  const [stats,   setStats]   = useState({ count: 0, total: 0, avg: 0 })
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [selectedSale,      setSelectedSale]      = useState<Sale | null>(null)
  const [showPrintOptions,  setShowPrintOptions]  = useState(false)
  const [showDetails,       setShowDetails]       = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingSale,       setEditingSale]       = useState<Sale | null>(null)
  const [pixSale,           setPixSale]           = useState<Sale | null>(null)
  const [errorMsg,          setErrorMsg]          = useState<string | null>(null)
  const [infoMsg,           setInfoMsg]           = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, st] = await Promise.all([getSales(), getTodayStats()])
    setSales(s)
    setStats(st)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const customerLabel = (s: Sale) =>
    s.patient?.full_name ?? s.customer_name ?? 'Cliente avulso'

  function handlePdfClick(s: Sale) {
    setSelectedSale(s)
    setShowPrintOptions(true)
  }

  async function handlePrint(copies: number) {
    if (!selectedSale) return
    const company = useAuthStore.getState().company
    if (!company) return
    
    if (copies === 1) {
      await downloadClientPdf(selectedSale, company, undefined, 'print')
    } else {
      await downloadAllPdfs(selectedSale, company, undefined, 'print')
    }
    setShowPrintOptions(false)
    setSelectedSale(null)
  }

  const handleWhatsApp = (s: Sale) => {
    const name = customerLabel(s)
    const phone = s.patient?.whatsapp || s.patient?.phone || ''
    const amount = formatCurrency(s.total_amount)
    
    const text = `Olá ${name}, tudo bem? A Minha Ótica agradece a sua preferência! Sua compra no valor de ${amount} foi finalizada com sucesso. Qualquer dúvida estamos à disposição!`
    const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleInvoice = (_s: Sale) => {
    setInfoMsg('Emissão de NF-e será disponibilizada no módulo Fiscal (Sprint 6). Integração com certificado digital A1.')
  }

  const handleWarranty = (s: Sale) => {
    const company = useAuthStore.getState().company
    if (!company) return
    downloadWarrantyPdf(s, company)
  }

  const handleDelete = async () => {
    if (!selectedSale) return
    try {
      await deleteSale(selectedSale.id)
      setShowDeleteConfirm(false)
      setSelectedSale(null)
      load()
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao excluir venda.')
    }
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-3 font-bold hover:underline">✕</button>
        </div>
      )}
      {infoMsg && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
          <span>{infoMsg}</span>
          <button onClick={() => setInfoMsg(null)} className="ml-3 font-bold hover:underline">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendas</h1>
          <p className="text-sm text-slate-500">Vendas diretas — itens prontos, pagamento imediato</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Download size={14}/>} onClick={() => exportSalesCsv(sales)}>
            CSV
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setModal(true)}>Nova Venda</Button>
        </div>
      </div>

      {/* Estatísticas do dia */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <TrendingUp size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Hoje</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.total)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <ShoppingCart size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Vendas Hoje</p>
            <p className="text-xl font-bold text-slate-900">{stats.count}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <Receipt size={20} className="text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ticket Médio</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.avg)}</p>
          </div>
        </Card>
      </div>

      {/* Lista */}
      {loading ? (
        <PageLoader />
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ShoppingCart size={40} className="text-slate-300" />
          <p className="text-slate-500">Nenhuma venda registrada ainda.</p>
          <Button icon={<Plus size={14} />} size="sm" onClick={() => setModal(true)}>
            Registrar primeira venda
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Nº Venda', 'Cliente', 'Vendedor', 'Itens', 'Pagamento', 'Total', 'Data', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map(s => {
                      const name = customerLabel(s)
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-primary-700">#{s.sale_number}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', colorOf(name))}>
                                {getInitials(name)}
                              </div>
                              <span className="font-medium text-slate-800">{name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-500 font-medium">
                              {s.seller?.full_name || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {s.items?.length ?? 0} {(s.items?.length ?? 0) === 1 ? 'item' : 'itens'}
                          </td>
                          <td className="px-4 py-3">
                            {s.payment_method
                              ? <Badge variant="info">{PAYMENT_LABELS[s.payment_method]}</Badge>
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatCurrency(s.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {formatDateTime(s.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Dropdown
                                trigger={
                                  <button
                                    title="Imprimir PDF"
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                  >
                                    <FileText size={12} /> PDF
                                  </button>
                                }
                              >
                                <DropdownItem icon={<FileText size={14} />} onClick={() => { setSelectedSale(s); handlePrint(1); }}>Uma via (Cliente)</DropdownItem>
                                <DropdownItem icon={<FileText size={14} />} onClick={() => { setSelectedSale(s); handlePrint(3); }}>Todas as vias</DropdownItem>
                              </Dropdown>

                              <button
                                onClick={() => handleWhatsApp(s)}
                                title="Enviar WhatsApp"
                                className="flex items-center justify-center rounded-lg border border-green-200 bg-green-50 p-1 text-green-600 hover:bg-green-100 transition-colors"
                              >
                                <MessageCircle size={14} />
                              </button>

                              <button
                                onClick={() => handleInvoice(s)}
                                title="Nota Fiscal"
                                className="flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-1 text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                <FileCheck size={14} />
                              </button>

                              <div className="h-4 w-px bg-slate-100 mx-1" />

                              <Dropdown
                                trigger={
                                  <button
                                    title="Mais opções"
                                    className="flex items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                }
                              >
                                <DropdownItem icon={<Eye size={14} className="text-blue-500" />} onClick={() => { setSelectedSale(s); setShowDetails(true); }}>Visualizar Detalhes</DropdownItem>
                                <DropdownItem icon={<Edit2 size={14} className="text-amber-500" />} onClick={() => setEditingSale(s)}>Editar Venda</DropdownItem>
                                <div className="h-px bg-slate-50 my-1" />
                                <DropdownItem icon={<ShieldCheck size={14} className="text-emerald-500" />} onClick={() => handleWarranty(s)}>Garantia (PDF)</DropdownItem>
                                <DropdownItem icon={<Receipt size={14} className="text-blue-500" />} onClick={() => handlePdfClick(s)}>Comprovante (PDF)</DropdownItem>
                                <DropdownItem icon={<QrCode size={14} className="text-indigo-500" />} onClick={() => setPixSale(s)}>Cobrar via Pix</DropdownItem>
                                <div className="h-px bg-slate-50 my-1" />
                                <DropdownItem icon={<Trash2 size={14} className="text-red-500" />} onClick={() => { setSelectedSale(s); setShowDeleteConfirm(true); }}>Excluir Registro</DropdownItem>
                              </Dropdown>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {sales.map(s => {
              const name = customerLabel(s)
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', colorOf(name))}>
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-primary-700">#{s.sale_number}</p>
                        <p className="font-semibold text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-500">
                          {s.items?.length ?? 0} {(s.items?.length ?? 0) === 1 ? 'item' : 'itens'}
                          {s.payment_method && ` · ${PAYMENT_LABELS[s.payment_method]}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <p className="font-bold text-slate-900">{formatCurrency(s.total_amount)}</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(s.created_at)}</p>
                      <div className="flex items-center gap-2">
                        <Dropdown
                          trigger={
                            <button
                              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
                            >
                              <FileText size={11} /> PDF
                            </button>
                          }
                          align="left"
                        >
                          <DropdownItem icon={<FileText size={14} />} onClick={() => { setSelectedSale(s); handlePrint(1); }}>Uma via</DropdownItem>
                          <DropdownItem icon={<FileText size={14} />} onClick={() => { setSelectedSale(s); handlePrint(3); }}>Todas as vias</DropdownItem>
                        </Dropdown>

                        <button
                          onClick={() => handleWhatsApp(s)}
                          className="flex items-center justify-center rounded-lg border border-green-200 bg-green-50 p-1 text-green-600"
                        >
                          <MessageCircle size={12} />
                        </button>
                        <button
                          onClick={() => handleInvoice(s)}
                          className="flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-1 text-blue-600"
                        >
                          <FileCheck size={12} />
                        </button>
                        
                        <Dropdown
                          trigger={
                            <button
                              className="flex items-center justify-center rounded-lg p-1 text-slate-400"
                            >
                              <MoreVertical size={16} />
                            </button>
                          }
                        >
                          <DropdownItem icon={<Eye size={14} />} onClick={() => { setSelectedSale(s); setShowDetails(true); }}>Visualizar</DropdownItem>
                          <DropdownItem icon={<Edit2 size={14} />} onClick={() => setEditingSale(s)}>Editar</DropdownItem>
                          <DropdownItem icon={<QrCode size={14} />} onClick={() => setPixSale(s)}>Cobrar Pix</DropdownItem>
                          <DropdownItem icon={<Trash2 size={14} />} onClick={() => { setSelectedSale(s); setShowDeleteConfirm(true); }}>Excluir</DropdownItem>
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Modals de CRUD */}
      <SaleModal 
        open={modal || !!editingSale} 
        onClose={() => { setModal(false); setEditingSale(null); }} 
        onSaved={load} 
        sale={editingSale || undefined} 
      />


      {/* Detalhes */}
      <SaleDetailsModal
        open={showDetails}
        onClose={() => { setShowDetails(false); setSelectedSale(null); }}
        sale={selectedSale}
        onPrint={() => { setShowDetails(false); setShowPrintOptions(true); }}
        onWhatsApp={() => { if(selectedSale) handleWhatsApp(selectedSale); }}
      />

      {/* Confirmação de Exclusão */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Excluir Venda" size="sm">
        <div className="py-4">
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir a venda <span className="font-bold text-slate-900">#{selectedSale?.sale_number}</span>? 
            Esta ação não pode ser desfeita.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="danger" onClick={handleDelete}>Confirmar Exclusão</Button>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <PrintOptionsModal
        open={showPrintOptions}
        onClose={() => {
          setShowPrintOptions(false)
          setSelectedSale(null)
        }}
        onSelect={handlePrint}
      />

      {/* Modal Cobrar via Pix */}
      {pixSale && (
        <Modal open={!!pixSale} onClose={() => setPixSale(null)} title="Cobrar via Pix" size="sm">
          {(() => {
            const settings = loadPixSettings()
            return (
              <div className="space-y-4 py-2">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">
                    Venda #{pixSale.sale_number} — {customerLabel(pixSale)}
                  </p>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(pixSale.total_amount)}</p>
                </div>
                {settings ? (
                  <>
                    <div className="flex justify-center">
                      <img
                        src={`https://gerarqrcodepix.com.br/api/v1?nome=${encodeURIComponent(settings.receiverName)}&cidade=${encodeURIComponent(settings.city)}&chave=${encodeURIComponent(settings.keyValue)}&valor=${pixSale.total_amount.toFixed(2)}&saida=qr`}
                        alt="QR Code Pix"
                        className="w-48 h-48 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Chave Pix</p>
                        <p className="text-sm font-mono font-semibold text-slate-800 truncate">{settings.keyValue}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(settings.keyValue)}
                        className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const phone = pixSale.patient?.whatsapp || pixSale.patient?.phone || ''
                        const text = `Olá! Sua compra de ${formatCurrency(pixSale.total_amount)} pode ser paga via Pix.\nChave: ${settings.keyValue}\nAgradecemos a preferência!`
                        window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
                    >
                      <MessageCircle size={15} /> Enviar via WhatsApp
                    </button>
                  </>
                ) : (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-700 text-center">
                    Configure sua chave Pix em <strong>Pix &amp; Pagamentos</strong> para gerar o QR Code.
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={() => setPixSale(null)} className="w-full">Fechar</Button>
              </div>
            )
          })()}
        </Modal>
      )}
    </div>
  )
}
