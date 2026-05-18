import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createConvenio, updateConvenio } from '@/services/convenios.service'
import { CONVENIO_TIPO_LABELS } from '@/types'
import type { Convenio, ConvenioTipo } from '@/types'

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
  convenio?: Convenio | null
}

const empty = {
  name:                '',
  cnpj:                '',
  tipo:                'saude' as ConvenioTipo,
  desconto_percentual: 0,
  contato_nome:        '',
  contato_telefone:    '',
  contato_email:       '',
  observacoes:         '',
  is_active:           true,
}

export function ConvenioModal({ open, onClose, onSuccess, convenio }: Props) {
  const [form,   setForm]   = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (convenio) {
      setForm({
        name:                convenio.name,
        cnpj:                convenio.cnpj ?? '',
        tipo:                convenio.tipo,
        desconto_percentual: convenio.desconto_percentual,
        contato_nome:        convenio.contato_nome ?? '',
        contato_telefone:    convenio.contato_telefone ?? '',
        contato_email:       convenio.contato_email ?? '',
        observacoes:         convenio.observacoes ?? '',
        is_active:           convenio.is_active,
      })
    } else {
      setForm(empty)
    }
    setError(null)
  }, [open, convenio])

  function set(field: keyof typeof empty, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Informe o nome do convênio.'); return }
    if (form.desconto_percentual < 0 || form.desconto_percentual > 100) {
      setError('Desconto deve ser entre 0 e 100%.')
      return
    }

    setSaving(true); setError(null)
    try {
      const payload = {
        name:                form.name.trim(),
        cnpj:                form.cnpj.trim() || undefined,
        tipo:                form.tipo,
        desconto_percentual: Number(form.desconto_percentual),
        contato_nome:        form.contato_nome.trim() || undefined,
        contato_telefone:    form.contato_telefone.trim() || undefined,
        contato_email:       form.contato_email.trim() || undefined,
        observacoes:         form.observacoes.trim() || undefined,
        is_active:           form.is_active,
      }

      if (convenio) {
        await updateConvenio(convenio.id, payload)
      } else {
        await createConvenio(payload)
      }
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={convenio ? 'Editar Convênio' : 'Novo Convênio'}
      size="md"
    >
      <div className="space-y-4 py-2">

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome *</label>
          <Input
            placeholder="Ex: Unimed, Bradesco Saúde..."
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => set('tipo', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none bg-white"
            >
              {(Object.keys(CONVENIO_TIPO_LABELS) as ConvenioTipo[]).map(t => (
                <option key={t} value={t}>{CONVENIO_TIPO_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Desconto (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="0"
              value={form.desconto_percentual}
              onChange={e => set('desconto_percentual', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">CNPJ</label>
          <Input
            placeholder="00.000.000/0001-00"
            value={form.cnpj}
            onChange={e => set('cnpj', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Contato</label>
            <Input
              placeholder="Nome do contato"
              value={form.contato_nome}
              onChange={e => set('contato_nome', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Telefone</label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.contato_telefone}
              onChange={e => set('contato_telefone', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail do Contato</label>
          <Input
            type="email"
            placeholder="contato@convenio.com.br"
            value={form.contato_email}
            onChange={e => set('contato_email', e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Observações</label>
          <textarea
            rows={2}
            value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)}
            placeholder="Informações adicionais..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => set('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
          />
          <span className="text-sm font-medium text-slate-700">Convênio ativo</span>
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>
            {convenio ? 'Salvar Alterações' : 'Cadastrar Convênio'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
