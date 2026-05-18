import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Upload, CheckCircle2, XCircle, AlertCircle, AlertTriangle, Undo2 } from 'lucide-react'
import { createPatient, getPatients, deletePatient } from '@/services/patients.service'
import { cn } from '@/lib/utils'

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
}

interface Row {
  full_name: string
  cpf?: string
  phone?: string
  email?: string
  status: 'pending' | 'duplicate' | 'success' | 'error'
  error?: string
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const col = (row: string[], name: string) => {
    const idx = header.indexOf(name)
    return idx >= 0 ? row[idx]?.replace(/^["']|["']$/g, '').trim() : ''
  }

  return lines.slice(1).map(line => {
    const parts = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,))/g) ?? line.split(',')
    const clean  = parts.map(p => p.replace(/^["']|["']$/g, '').trim())

    const name = col(clean, 'nome') || col(clean, 'full_name') || col(clean, 'name') || clean[0]
    if (!name) return null

    return {
      full_name: name,
      cpf:       col(clean, 'cpf') || undefined,
      phone:     col(clean, 'telefone') || col(clean, 'phone') || undefined,
      email:     col(clean, 'email') || undefined,
      status:    'pending' as const,
    }
  }).filter(Boolean) as Row[]
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

const ROLLBACK_KEY = 'import_patients_last_batch'

export function ImportPatientsModal({ open, onClose, onSuccess }: Props) {
  const [rows,         setRows]         = useState<Row[]>([])
  const [importing,    setImporting]    = useState(false)
  const [checking,     setChecking]     = useState(false)
  const [done,         setDone]         = useState(false)
  const [rollingBack,  setRollingBack]  = useState(false)
  const [rolledBack,   setRolledBack]   = useState(false)
  const [lastBatch,    setLastBatch]    = useState<{ batchId: string; ids: string[] } | null>(
    () => {
      try { return JSON.parse(localStorage.getItem(ROLLBACK_KEY) ?? 'null') } catch { return null }
    }
  )
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setRows([])
    setDone(false)
    setRolledBack(false)
  }

  async function handleRollback() {
    if (!lastBatch) return
    setRollingBack(true)
    for (const id of lastBatch.ids) {
      try { await deletePatient(id) } catch { /* ignora se já foi deletado */ }
    }
    localStorage.removeItem(ROLLBACK_KEY)
    setLastBatch(null)
    setRollingBack(false)
    setRolledBack(true)
    onSuccess()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const text = await file.text()
    const parsed = parseCsv(text)
    setDone(false)

    // Verificar duplicatas por CPF contra pacientes já cadastrados
    const cpfsInFile = parsed.map(r => r.cpf).filter(Boolean).map(c => normalizeCpf(c!))
    if (cpfsInFile.length > 0) {
      setChecking(true)
      try {
        const existing = await getPatients()
        const existingCpfs = new Set(
          existing.filter(p => p.cpf).map(p => normalizeCpf(p.cpf!))
        )
        setRows(parsed.map(r => ({
          ...r,
          status: r.cpf && existingCpfs.has(normalizeCpf(r.cpf)) ? 'duplicate' : 'pending',
        })))
      } catch {
        setRows(parsed)
      } finally {
        setChecking(false)
      }
    } else {
      setRows(parsed)
    }
  }

  async function handleImport() {
    if (!rows.length) return
    setImporting(true)
    const updated = [...rows]
    const batchId = `${Date.now()}`
    const createdIds: string[] = []

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'success' || updated[i].status === 'duplicate') continue
      try {
        const created = await createPatient({
          full_name: updated[i].full_name,
          cpf:       updated[i].cpf ?? '',
          phone:     updated[i].phone ?? '',
          email:     updated[i].email ?? '',
          is_active: true,
        })
        if (created?.id) createdIds.push(created.id)
        updated[i] = { ...updated[i], status: 'success' }
      } catch (err: any) {
        updated[i] = { ...updated[i], status: 'error', error: err.message }
      }
      setRows([...updated])
    }

    if (createdIds.length > 0) {
      const batch = { batchId, ids: createdIds }
      localStorage.setItem(ROLLBACK_KEY, JSON.stringify(batch))
      setLastBatch(batch)
    }

    setImporting(false)
    setDone(true)
    const importable = updated.filter(r => r.status !== 'duplicate')
    if (importable.every(r => r.status === 'success')) {
      onSuccess()
    }
  }

  const successCount   = rows.filter(r => r.status === 'success').length
  const errorCount     = rows.filter(r => r.status === 'error').length
  const duplicateCount = rows.filter(r => r.status === 'duplicate').length
  const pendingCount   = rows.filter(r => r.status === 'pending').length

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Importar Pacientes via CSV"
      size="lg"
    >
      <div className="space-y-4 py-2">

        {/* Formato */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">Formato do CSV:</p>
          <code className="block font-mono">nome,cpf,telefone,email</code>
          <code className="block font-mono">Maria Silva,123.456.789-00,(11)99999-9999,maria@email.com</code>
          <p className="mt-1 text-blue-500">Apenas a coluna <strong>nome</strong> é obrigatória.</p>
        </div>

        {/* Upload zone */}
        {rows.length === 0 && !checking && (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
          >
            <Upload size={28} className="text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">Clique para selecionar o CSV</p>
              <p className="text-xs text-slate-400 mt-0.5">ou arraste o arquivo aqui</p>
            </div>
          </div>
        )}

        {checking && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
            <span className="animate-spin inline-block h-4 w-4 border-2 border-slate-300 border-t-blue-500 rounded-full" />
            Verificando duplicatas...
          </div>
        )}

        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />

        {/* Preview */}
        {rows.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-700">
                  {rows.length} registro{rows.length !== 1 ? 's' : ''}
                </p>
                {duplicateCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    <AlertTriangle size={11} />
                    {duplicateCount} duplicado{duplicateCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {!importing && !done && (
                <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">
                  Trocar arquivo
                </button>
              )}
            </div>

            {duplicateCount > 0 && !done && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Registros com CPF já cadastrado serão ignorados na importação.</span>
              </div>
            )}

            {done && (
              <div className="space-y-2">
                <div className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium',
                  errorCount === 0
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border border-amber-200 text-amber-700'
                )}>
                  <AlertCircle size={15} />
                  {rolledBack
                    ? 'Importação desfeita com sucesso.'
                    : errorCount === 0
                      ? `${successCount} paciente${successCount !== 1 ? 's' : ''} importado${successCount !== 1 ? 's' : ''} com sucesso!`
                      : `${successCount} importados · ${errorCount} com erro`
                  }
                  {!rolledBack && duplicateCount > 0 && ` · ${duplicateCount} ignorado${duplicateCount !== 1 ? 's' : ''} (duplicado${duplicateCount !== 1 ? 's' : ''})`}
                </div>
                {lastBatch && lastBatch.ids.length > 0 && !rolledBack && (
                  <button
                    onClick={handleRollback}
                    disabled={rollingBack}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    <Undo2 size={13} />
                    {rollingBack ? 'Desfazendo...' : `Desfazer importação (remover ${lastBatch.ids.length} paciente${lastBatch.ids.length !== 1 ? 's' : ''})`}
                  </button>
                )}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 rounded-lg border border-slate-100">
              {rows.map((row, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-3 px-3 py-2',
                  row.status === 'duplicate' && 'bg-amber-50/60'
                )}>
                  {row.status === 'success'
                    ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    : row.status === 'error'
                    ? <XCircle size={14} className="text-red-500 flex-shrink-0" />
                    : row.status === 'duplicate'
                    ? <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    : <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{row.full_name}</p>
                    <p className="text-[10px] text-slate-400">
                      {[row.cpf, row.phone, row.email].filter(Boolean).join(' · ')}
                    </p>
                    {row.status === 'duplicate' && (
                      <p className="text-[10px] text-amber-600">CPF já cadastrado — será ignorado</p>
                    )}
                    {row.error && <p className="text-[10px] text-red-500">{row.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={() => { reset(); onClose() }}>
            {done ? 'Fechar' : 'Cancelar'}
          </Button>
          {rows.length > 0 && !done && (
            <Button loading={importing} onClick={handleImport} disabled={pendingCount === 0}>
              Importar {pendingCount} Paciente{pendingCount !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
