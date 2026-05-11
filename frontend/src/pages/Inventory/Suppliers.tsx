import { useState, useEffect, useCallback } from 'react'
import { Plus, Truck, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { SupplierModal } from '@/components/inventory/SupplierModal'
import { getSuppliers, deleteSupplier } from '@/services/suppliers.service'
import { formatPhone, getInitials, cn } from '@/lib/utils'
import type { Supplier } from '@/types'

const COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500']
const colorOf = (name: string) => COLORS[[...name].reduce((a,c) => a + c.charCodeAt(0), 0) % COLORS.length]

export default function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [selected,  setSelected]  = useState<Supplier | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getSuppliers(search || undefined)
    setSuppliers(data)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  function openEdit(s: Supplier) { setSelected(s); setModal(true) }
  function openNew()             { setSelected(null); setModal(true) }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Desativar fornecedor "${s.name}"?`)) return
    await deleteSupplier(s.id)
    load()
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">{suppliers.length} fornecedor{suppliers.length !== 1 ? 'es' : ''}</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Novo Fornecedor</Button>
      </div>

      <Input className="mt-3" placeholder="Buscar por nome, CNPJ ou contato…"
        value={search} onChange={e => setSearch(e.target.value)}
        icon={<Plus size={16} className="opacity-0" />} />

      {loading ? (
        <PageLoader />
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Truck size={36} className="text-slate-300" />
          <p className="text-slate-500">
            {search ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'}
          </p>
          <Button size="sm" icon={<Plus size={14} />} onClick={openNew}>Cadastrar fornecedor</Button>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="mt-4 hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Fornecedor', 'CNPJ', 'Contato', 'Telefone', 'E-mail', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suppliers.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white', colorOf(s.name))}>
                              {getInitials(s.name)}
                            </div>
                            <span className="font-medium text-slate-800">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.cnpj ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{s.contact_name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{s.phone ? formatPhone(s.phone) : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{s.email ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(s)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(s)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile: cards */}
          <div className="mt-3 space-y-3 md:hidden">
            {suppliers.map(s => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white', colorOf(s.name))}>
                      {getInitials(s.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                      {s.contact_name && <p className="text-xs text-slate-500">{s.contact_name}</p>}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                        {s.phone && <span className="flex items-center gap-1"><Phone size={11} />{formatPhone(s.phone)}</span>}
                        {s.email && <span className="flex items-center gap-1"><Mail size={11} />{s.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="rounded p-1.5 text-slate-400 hover:text-slate-700">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(s)} className="rounded p-1.5 text-slate-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SupplierModal open={modal} onClose={() => setModal(false)} supplier={selected} onSaved={load} />
    </>
  )
}
