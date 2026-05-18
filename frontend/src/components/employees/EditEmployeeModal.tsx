import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { updateEmployee } from '@/services/employees.service'
import type { Profile, UserRole } from '@/types'

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
  employee:  Profile | null
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'atendente', label: 'Atendente' },
  { value: 'tecnico',   label: 'Técnico' },
  { value: 'gerente',   label: 'Gerente' },
  { value: 'admin',     label: 'Administrador' },
]

export function EditEmployeeModal({ open, onClose, onSuccess, employee }: Props) {
  const [full_name, setFullName] = useState('')
  const [phone,     setPhone]    = useState('')
  const [role,      setRole]     = useState<UserRole>('atendente')
  const [saving,    setSaving]   = useState(false)
  const [error,     setError]    = useState<string | null>(null)

  useEffect(() => {
    if (open && employee) {
      setFullName(employee.full_name)
      setPhone(employee.phone ?? '')
      setRole(employee.role)
      setError(null)
    }
  }, [open, employee])

  async function handleSave() {
    if (!full_name.trim()) { setError('Informe o nome.'); return }
    if (!employee) return

    setSaving(true); setError(null)
    try {
      await updateEmployee(employee.id, {
        full_name: full_name.trim(),
        phone:     phone.trim() || undefined,
        role,
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
    <Modal open={open} onClose={onClose} title="Editar Funcionário" size="md">
      <div className="space-y-4 py-2">

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome Completo *</label>
          <Input
            value={full_name}
            onChange={e => setFullName(e.target.value)}
            placeholder="Nome completo"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Telefone</label>
            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Perfil *</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none bg-white"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
