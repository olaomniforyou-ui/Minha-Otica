import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Plus, X } from 'lucide-react'
import type { Patient } from '@/types'
import { cn } from '@/lib/utils'

interface PatientSelectProps {
  patients:  Patient[]
  value:     string
  onChange:  (id: string) => void
  onNew:     () => void
  required?: boolean
  label?:    string
}

export function PatientSelect({ patients, value, onChange, onNew, required, label = 'Paciente' }: PatientSelectProps) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  const selected = patients.find(p => p.id === value)

  // Fecha ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Foca o input de busca quando abre
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = patients.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.cpf   ?? '').includes(q) ||
      (p.phone  ?? '').includes(q)
    )
  }).slice(0, 30)

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
          'bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary-500',
          open ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-slate-200 hover:border-slate-300',
          !selected && 'text-slate-400',
        )}
      >
        <span className="truncate font-medium text-slate-800">
          {selected ? selected.full_name : 'Selecione o paciente...'}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selected && (
            <X size={13} className="text-slate-400 hover:text-slate-600" onClick={clear} />
          )}
          <ChevronDown size={14} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Busca */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={13} className="shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF ou telefone..."
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X size={13} className="text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-center text-xs text-slate-400">Nenhum paciente encontrado.</p>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p.id)}
                  className={cn(
                    'flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-primary-50',
                    p.id === value && 'bg-primary-50',
                  )}
                >
                  <span className="text-sm font-medium text-slate-800">{p.full_name}</span>
                  <span className="text-[11px] text-slate-400">
                    {[p.phone, p.cpf].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Novo paciente */}
          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setSearch(''); onNew() }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
            >
              <Plus size={14} /> Cadastrar novo paciente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
