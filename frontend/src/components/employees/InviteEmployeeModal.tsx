import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { inviteEmployee } from '@/services/employees.service'
import type { UserRole } from '@/types'

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'atendente', label: 'Atendente' },
  { value: 'tecnico',   label: 'Técnico' },
  { value: 'gerente',   label: 'Gerente' },
  { value: 'admin',     label: 'Administrador' },
]

const empty = { email: '', full_name: '', phone: '', role: 'atendente' as UserRole }

export function InviteEmployeeModal({ open, onClose, onSuccess }: Props) {
  const [form,   setForm]   = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (open) { setForm(empty); setError(null) }
  }, [open])

  function set(field: keyof typeof empty, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.email.trim())     { setError('Informe o e-mail.'); return }
    if (!form.full_name.trim()) { setError('Informe o nome completo.'); return }

    setSaving(true); setError(null)
    try {
      await inviteEmployee({
        email:     form.email.trim().toLowerCase(),
        full_name: form.full_name.trim(),
        role:      form.role,
        phone:     form.phone.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Funcionário" size="md">
      <div className="space-y-4 py-2">

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome Completo *</label>
          <Input
            placeholder="Ex: Maria Silva"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail *</label>
          <Input
            type="email"
            placeholder="funcionario@email.com"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Telefone</label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Perfil *</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none bg-white"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Uma senha temporária será gerada automaticamente. O funcionário deverá trocar no primeiro acesso.
        </p>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>Adicionar Funcionário</Button>
        </div>
      </div>
    </Modal>
  )
}
