import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface PrintOptionsModalProps {
  open: boolean
  onClose: () => void
  onSelect: (copies: number) => void
}

export function PrintOptionsModal({ open, onClose, onSelect }: PrintOptionsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Opções de Impressão"
      size="sm"
    >
      <div className="space-y-4 py-2">
        <p className="text-sm text-slate-600">Como deseja imprimir o PDF da venda?</p>
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => onSelect(1)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-600">1</div>
            <div className="text-left">
              <p className="font-medium text-slate-900">Imprimir via única</p>
              <p className="text-xs text-slate-500">Apenas o comprovante do cliente</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => onSelect(3)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-600">3</div>
            <div className="text-left">
              <p className="font-medium text-slate-900">Imprimir todas as vias</p>
              <p className="text-xs text-slate-500">Cliente, Laboratório e Controle Interno</p>
            </div>
          </Button>
        </div>
        <div className="mt-4 flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
