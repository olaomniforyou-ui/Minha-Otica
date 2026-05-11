import { cn } from '@/lib/utils'
import type { ServiceOrderStatus, LabStatus } from '@/types'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error:   'bg-red-100 text-red-700',
  info:    'bg-blue-100 text-blue-700',
  purple:  'bg-purple-100 text-purple-700',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ── Badges específicos de status de OS ───────────────────────
const ORDER_STATUS_MAP: Record<ServiceOrderStatus, { label: string; variant: BadgeVariant }> = {
  orcamento:   { label: 'Orçamento',       variant: 'default' },
  aprovado:    { label: 'Aprovado',        variant: 'info' },
  producao:    { label: 'Em Produção',     variant: 'warning' },
  laboratorio: { label: 'Em Laboratório',  variant: 'purple' },
  pronto:      { label: 'Pronto',          variant: 'success' },
  entregue:    { label: 'Entregue',        variant: 'success' },
  cancelado:   { label: 'Cancelado',       variant: 'error' },
}

export function OrderStatusBadge({ status }: { status: ServiceOrderStatus }) {
  const { label, variant } = ORDER_STATUS_MAP[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

// ── Badges de status de lab ───────────────────────────────────
const LAB_STATUS_MAP: Record<LabStatus, { label: string; variant: BadgeVariant }> = {
  aguardando_envio: { label: 'Aguardando Envio',   variant: 'default' },
  enviado:          { label: 'Enviado',            variant: 'info' },
  em_producao:      { label: 'Em Produção',        variant: 'warning' },
  pronto_retorno:   { label: 'Pronto p/ Retorno',  variant: 'success' },
  retornado:        { label: 'Retornado',          variant: 'success' },
  com_defeito:      { label: 'Com Defeito',        variant: 'error' },
}

export function LabStatusBadge({ status }: { status: LabStatus }) {
  const { label, variant } = LAB_STATUS_MAP[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}
