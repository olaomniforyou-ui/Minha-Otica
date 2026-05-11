import { useState, useEffect } from 'react'
import { Plus, Search, MoreVertical, Shield, User, Phone, CheckCircle2, XCircle, Mail, Edit2, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { getEmployees, updateEmployee, deleteEmployee } from '@/services/employees.service'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { Modal } from '@/components/ui/Modal'
import { cn, getInitials } from '@/lib/utils'
import type { Profile, UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin:    'Administrador',
  gerente:  'Gerente',
  atendente: 'Atendente',
  tecnico:  'Técnico'
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin:    'bg-purple-100 text-purple-700 border-purple-200',
  gerente:  'bg-blue-100 text-blue-700 border-blue-200',
  atendente: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  tecnico:  'bg-amber-100 text-amber-700 border-amber-200'
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    setLoading(true)
    try {
      const data = await getEmployees()
      setEmployees(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = employees.filter(e => 
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  async function handleToggleStatus(employee: Profile) {
    try {
      await updateEmployee(employee.id, { is_active: !employee.is_active })
      loadEmployees()
    } catch (err) {
      alert('Erro ao atualizar status.')
    }
  }

  async function handleDelete() {
    if (!selectedEmployee) return
    try {
      await deleteEmployee(selectedEmployee.id)
      setShowDeleteConfirm(false)
      setSelectedEmployee(null)
      loadEmployees()
    } catch (err) {
      alert('Erro ao excluir funcionário.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Funcionários</h1>
          <p className="text-sm text-slate-500">Gerencie a equipe e permissões de acesso</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => alert('Para adicionar um novo funcionário, convide-o via e-mail (funcionalidade em integração).')}>
          Novo Funcionário
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            className="pl-10"
            placeholder="Buscar por nome ou cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <User className="mx-auto h-12 w-12 text-slate-200" />
          <p className="mt-2 text-slate-500">Nenhum funcionário encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(employee => (
            <Card key={employee.id} className="relative overflow-hidden group">
              <div className={cn(
                "absolute top-0 left-0 w-1.5 h-full",
                employee.is_active ? "bg-primary-600" : "bg-slate-300"
              )} />
              
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 border border-slate-200">
                      {employee.avatar_url ? (
                        <img src={employee.avatar_url} alt={employee.full_name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        getInitials(employee.full_name)
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{employee.full_name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                          ROLE_COLORS[employee.role]
                        )}>
                          {ROLE_LABELS[employee.role]}
                        </span>
                        {!employee.is_active && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Dropdown
                    trigger={
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                        <MoreVertical size={18} />
                      </button>
                    }
                  >
                    <DropdownItem icon={<Edit2 size={14} />} onClick={() => alert('Edição de perfil em breve.')}>Editar Perfil</DropdownItem>
                    <DropdownItem 
                      icon={employee.is_active ? <XCircle size={14} className="text-amber-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />} 
                      onClick={() => handleToggleStatus(employee)}
                    >
                      {employee.is_active ? 'Desativar' : 'Ativar'}
                    </DropdownItem>
                    <div className="h-px bg-slate-50 my-1" />
                    <DropdownItem icon={<Trash2 size={14} className="text-red-500" />} onClick={() => { setSelectedEmployee(employee); setShowDeleteConfirm(true); }}>
                      Excluir
                    </DropdownItem>
                  </Dropdown>
                </div>

                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-slate-500">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">E-mail oculto p/ segurança</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-500">
                      <Phone size={14} className="text-slate-400" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm text-slate-500">
                    <Shield size={14} className="text-slate-400" />
                    <span>Membro desde {new Date(employee.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmação de Exclusão */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Excluir Funcionário" size="sm">
        <div className="py-4">
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir <span className="font-bold text-slate-900">{selectedEmployee?.full_name}</span>? 
            Esta ação desativará o acesso deste usuário ao sistema.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="danger" onClick={handleDelete}>Confirmar Exclusão</Button>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
