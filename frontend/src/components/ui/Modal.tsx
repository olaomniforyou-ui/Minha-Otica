import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface ModalProps {
  open:      boolean
  onClose:   () => void
  title:     string
  subtitle?: string
  children:  ReactNode
  footer?:   ReactNode
  size?:     ModalSize
}

// max-width no desktop e altura máxima no mobile
const SIZE: Record<ModalSize, { maxW: string; mobileH: string }> = {
  sm:   { maxW: 'sm:max-w-sm',   mobileH: 'max-h-[70vh]'  },
  md:   { maxW: 'sm:max-w-md',   mobileH: 'max-h-[80vh]'  },
  lg:   { maxW: 'sm:max-w-xl',   mobileH: 'max-h-[88vh]'  },
  xl:   { maxW: 'sm:max-w-3xl',  mobileH: 'max-h-[93vh]'  },
  '2xl':{ maxW: 'sm:max-w-5xl',  mobileH: 'max-h-[95vh]'  },
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  // Fecha com ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Trava scroll do body
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const { maxW, mobileH } = SIZE[size]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 lg:p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Painel */}
      <div
        className={cn(
          // Base
          'relative z-10 flex w-full flex-col bg-white shadow-2xl',
          // Mobile: bottom sheet, altura proporcional ao conteúdo
          'rounded-t-2xl',
          mobileH,
          // Desktop: centralizado, rounded completo, altura máxima 90vh
          'sm:rounded-2xl sm:max-h-[90vh]',
          maxW,
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo — rola verticalmente */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
