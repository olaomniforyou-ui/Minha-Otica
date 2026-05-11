import { Sparkles, Plus, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Product, PrescriptionFormData } from '@/types'

interface Props {
  prescription: Partial<PrescriptionFormData>
  products: Product[]
  onAdd: (product: Product) => void
}

type RecommendationTag = 'progressiva' | 'alto-indice' | 'astigmatismo' | 'armacao' | 'lente'

function classifyProduct(product: Product): RecommendationTag[] {
  const catName = (product.category?.name ?? '').toLowerCase()
  const name = product.name.toLowerCase()
  const tags: RecommendationTag[] = []

  const isLens = catName.includes('lente') || name.includes('lente')
  const isFrame = catName.includes('armação') || catName.includes('armacao') ||
    catName.includes('frame') || name.includes('armação') || name.includes('armacao')

  if (isLens) tags.push('lente')
  if (isFrame) tags.push('armacao')

  const isProg = catName.includes('progress') || name.includes('progress') ||
    catName.includes('multifocal') || name.includes('multifocal')
  if (isProg) tags.push('progressiva')

  const isHi = catName.includes('alto') || name.includes('alto') ||
    catName.includes('high index') || name.includes('high index') ||
    catName.includes('hi index') || name.includes('hi index')
  if (isHi) tags.push('alto-indice')

  return tags
}

function scoreProduct(
  product: Product,
  tags: RecommendationTag[],
  prescription: Partial<PrescriptionFormData>,
): number {
  let score = 0

  const avgEsf = ((prescription.od_esf ?? 0) + (prescription.oe_esf ?? 0)) / 2
  const avgCil = ((prescription.od_cil ?? 0) + (prescription.oe_cil ?? 0)) / 2
  const avgAdd = ((prescription.od_add ?? 0) + (prescription.oe_add ?? 0)) / 2
  const highPower = Math.abs(avgEsf) > 4
  const hasAstig = Math.abs(avgCil) > 0.5
  const hasAdd = avgAdd > 0

  if (tags.includes('armacao')) score += 10
  if (tags.includes('lente')) score += 8

  if (hasAdd && tags.includes('progressiva')) score += 12
  if (highPower && tags.includes('alto-indice')) score += 10
  if (hasAstig && tags.includes('lente')) score += 4

  if (product.stock_quantity > 0) score += 5
  if (product.stock_quantity > 10) score += 2

  return score
}

const TAG_LABELS: Record<RecommendationTag, string> = {
  progressiva: 'Progressiva',
  'alto-indice': 'Alto Índice',
  astigmatismo: 'Astigmatismo',
  armacao: 'Armação',
  lente: 'Lente',
}

const TAG_COLORS: Record<RecommendationTag, string> = {
  progressiva: 'bg-violet-100 text-violet-700',
  'alto-indice': 'bg-blue-100 text-blue-700',
  astigmatismo: 'bg-orange-100 text-orange-700',
  armacao: 'bg-emerald-100 text-emerald-700',
  lente: 'bg-sky-100 text-sky-700',
}

function prescriptionHasData(p: Partial<PrescriptionFormData>): boolean {
  return [p.od_esf, p.od_cil, p.oe_esf, p.oe_cil].some(v => v !== undefined && v !== null)
}

export function ProductRecommendations({ prescription, products, onAdd }: Props) {
  if (!prescriptionHasData(prescription)) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <AlertCircle size={14} />
        Preencha os dados da receita para ver as recomendações de produtos.
      </div>
    )
  }

  const activeProducts = products.filter(p => p.is_active && p.stock_quantity > 0)

  const scored = activeProducts
    .map(p => {
      const tags = classifyProduct(p)
      const score = scoreProduct(p, tags, prescription)
      return { product: p, tags, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)

  if (scored.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <AlertCircle size={14} />
        Nenhum produto adequado encontrado no estoque. Cadastre produtos com categorias de Lentes e Armações.
      </div>
    )
  }

  const avgAdd = ((prescription.od_add ?? 0) + (prescription.oe_add ?? 0)) / 2
  const avgEsf = ((prescription.od_esf ?? 0) + (prescription.oe_esf ?? 0)) / 2
  const chips: string[] = []
  if (avgAdd > 0) chips.push('Receita Progressiva')
  if (Math.abs(avgEsf) > 4) chips.push('Alto Grau')
  if (Math.abs(avgEsf) <= 4 && avgEsf !== 0) chips.push('Grau Moderado')

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-amber-500" />
        <span className="text-sm font-semibold text-slate-800">Recomendações para esta receita</span>
        {chips.map(c => (
          <span key={c} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{c}</span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {scored.map(({ product, tags }) => (
          <div
            key={product.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-primary-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{product.name}</p>
                {product.category && (
                  <p className="text-[10px] text-slate-500">{product.category.name}</p>
                )}
              </div>
              <p className="text-xs font-bold text-primary-700 shrink-0">{formatCurrency(product.sale_price)}</p>
            </div>

            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <span key={tag} className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${TAG_COLORS[tag]}`}>
                  {TAG_LABELS[tag]}
                </span>
              ))}
              {product.stock_quantity <= 3 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-600">
                  Últimas unidades
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onAdd(product)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 py-1 text-[11px] font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
            >
              <Plus size={11} /> Adicionar ao pedido
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
