import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Eye, ShoppingBag, Phone, MapPin, MessageCircle, Loader2, Package, Share2, X, User, Check } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface CatalogCompany {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  logo_url?: string
}

interface CatalogProduct {
  id: string
  name: string
  description?: string
  sale_price: number
  stock_quantity: number
  category_id?: string
  image_url?: string
}

interface CatalogCategory {
  id: string
  name: string
}

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001')

export default function CatalogPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const [company,    setCompany]    = useState<CatalogCompany | null>(null)
  const [products,   setProducts]   = useState<CatalogProduct[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('')
  const [cart,       setCart]       = useState<string[]>([])
  const [showForm,   setShowForm]   = useState(false)
  const [formName,   setFormName]   = useState('')
  const [formPhone,  setFormPhone]  = useState('')
  const [formMsg,    setFormMsg]    = useState('')
  const [copiedShare, setCopiedShare] = useState(false)
  const [detailProduct, setDetailProduct] = useState<CatalogProduct | null>(null)

  useEffect(() => {
    if (!companyId) return
    fetch(`${API_URL}/api/catalog/${companyId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setCompany(d.company)
        setProducts(d.products)
        setCategories(d.categories)
      })
      .catch(() => setError('Não foi possível carregar o catálogo.'))
      .finally(() => setLoading(false))
  }, [companyId])

  // SEO meta tags dinâmicas
  useEffect(() => {
    if (!company) return
    document.title = `Catálogo — ${company.name}`
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    setMeta('og:title',       `Catálogo — ${company.name}`)
    setMeta('og:description', `Veja os produtos disponíveis em ${company.name}. Solicite seu orçamento online!`)
    setMeta('og:url',         window.location.href)
    return () => { document.title = 'Minha Ótica' }
  }, [company])

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = !catFilter || p.category_id === catFilter
      return matchSearch && matchCat
    })
  }, [products, search, catFilter])

  function toggleCart(id: string) {
    setCart(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function buildWhatsAppLink(name?: string, phone?: string, msg?: string) {
    const selected = cart.map(id => products.find(p => p.id === id)?.name).filter(Boolean)
    const greeting = name ? `Olá, meu nome é ${name}. ` : 'Olá! '
    const text = encodeURIComponent(
      `${greeting}Vi o catálogo da ${company?.name} e gostaria de um orçamento para:\n${selected.map(n => `• ${n}`).join('\n')}${phone ? `\n\nMeu telefone: ${phone}` : ''}${msg ? `\n\nObservação: ${msg}` : ''}`
    )
    const storePhone = company?.phone?.replace(/\D/g, '') ?? ''
    return `https://wa.me/55${storePhone}?text=${text}`
  }

  function submitForm() {
    window.open(buildWhatsAppLink(formName, formPhone, formMsg), '_blank')
    setShowForm(false)
    setCart([])
    setFormName(''); setFormPhone(''); setFormMsg('')
  }

  function shareStore() {
    const url = window.location.href
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string; url: string }) => Promise<void> }
    if (nav.share) {
      nav.share({ title: company?.name ?? 'Catálogo', text: `Conheça o catálogo de ${company?.name}!`, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedShare(true)
        setTimeout(() => setCopiedShare(false), 2500)
      })
    }
  }

  const cartTotal = cart.reduce((sum, id) => sum + (products.find(p => p.id === id)?.sale_price ?? 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500 gap-3">
        <Eye size={40} className="opacity-20" />
        <p className="font-medium">{error || 'Catálogo não encontrado.'}</p>
      </div>
    )
  }

  const catName = (id?: string) => categories.find(c => c.id === id)?.name ?? ''

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {company.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-slate-900">{company.name}</h1>
              {(company.city || company.state) && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin size={11} />{[company.city, company.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                <Phone size={14} /> {company.phone}
              </a>
            )}
            <button
              onClick={shareStore}
              title="Copiar link do catálogo"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              {copiedShare ? <Check size={13} className="text-green-500" /> : <Share2 size={13} />}
              {copiedShare ? 'Copiado!' : 'Compartilhar'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCatFilter('')}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  !catFilter ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300',
                )}
              >
                Todos
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCatFilter(c.id === catFilter ? '' : c.id)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    catFilter === c.id ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contagem */}
        <p className="text-xs text-slate-500">
          {filtered.length} produto{filtered.length !== 1 ? 's' : ''} disponíve{filtered.length !== 1 ? 'is' : 'l'}
        </p>

        {/* Grid de produtos */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400 gap-3">
            <Package size={36} className="opacity-20" />
            <p className="text-sm">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(p => {
              const inCart = cart.includes(p.id)
              return (
                <div
                  key={p.id}
                  className={cn(
                    'rounded-2xl bg-white border transition-all overflow-hidden group',
                    inCart ? 'border-indigo-400 ring-2 ring-indigo-400/20' : 'border-slate-200 hover:shadow-md',
                  )}
                >
                  {/* Imagem — clica para ver detalhes */}
                  <button
                    onClick={() => setDetailProduct(p)}
                    className="aspect-square w-full bg-slate-100 flex items-center justify-center overflow-hidden focus:outline-none"
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <Eye size={32} className="text-slate-300" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    {p.category_id && (
                      <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">{catName(p.category_id)}</p>
                    )}
                    <button onClick={() => setDetailProduct(p)} className="text-left">
                      <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 hover:text-indigo-700 transition-colors">{p.name}</p>
                    </button>
                    {p.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">{p.description}</p>
                    )}
                    <p className="text-base font-extrabold text-indigo-700">{formatCurrency(p.sale_price)}</p>
                    <button
                      onClick={() => toggleCart(p.id)}
                      className={cn(
                        'w-full rounded-xl py-1.5 text-xs font-semibold transition-all',
                        inCart
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600',
                      )}
                    >
                      {inCart ? '✓ Selecionado' : 'Pedir orçamento'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating cart bar */}
      {cart.length > 0 && !showForm && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-2xl px-5 py-3">
          <ShoppingBag size={16} className="text-indigo-600" />
          <div>
            <span className="text-sm font-semibold text-slate-800">
              {cart.length} item{cart.length > 1 ? 'ns' : ''} selecionado{cart.length > 1 ? 's' : ''}
            </span>
            <span className="block text-xs font-bold text-indigo-600">{formatCurrency(cartTotal)}</span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-white hover:bg-green-600 transition-colors"
          >
            <MessageCircle size={14} /> Solicitar orçamento
          </button>
          <button onClick={() => setCart([])} className="text-xs text-slate-400 hover:text-slate-600">Limpar</button>
        </div>
      )}

      {/* Modal formulário de orçamento */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-slate-800">Solicitar Orçamento</p>
                <p className="text-xs text-slate-500">{cart.length} item{cart.length > 1 ? 'ns' : ''} selecionado{cart.length > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1">
                <X size={18} />
              </button>
            </div>

            {/* Resumo dos itens */}
            <div className="rounded-xl bg-slate-50 p-3 space-y-1">
              {cart.map(id => {
                const p = products.find(x => x.id === id)
                return p ? (
                  <div key={id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{p.name}</span>
                    <span className="text-indigo-700 font-bold">{formatCurrency(p.sale_price)}</span>
                  </div>
                ) : null
              })}
              <div className="flex items-center justify-between text-xs pt-1.5 mt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Total estimado</span>
                <span className="font-bold text-indigo-700">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  <User size={11} className="inline mr-1" /> Seu nome
                </label>
                <input
                  type="text"
                  placeholder="Como podemos te chamar?"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  <Phone size={11} className="inline mr-1" /> Seu WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="(11) 9 9999-9999"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Observação (opcional)</label>
                <textarea
                  placeholder="Cor, tamanho, dúvidas..."
                  value={formMsg}
                  onChange={e => setFormMsg(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitForm}
                disabled={!formName.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                <MessageCircle size={14} /> Enviar via WhatsApp
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe do produto */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setDetailProduct(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {detailProduct.image_url ? (
              <img src={detailProduct.image_url} alt={detailProduct.name} className="w-full h-52 object-cover" />
            ) : (
              <div className="w-full h-36 bg-slate-100 flex items-center justify-center">
                <Eye size={40} className="text-slate-300" />
              </div>
            )}
            <div className="p-5 space-y-3">
              {detailProduct.category_id && (
                <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wide">{catName(detailProduct.category_id)}</p>
              )}
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{detailProduct.name}</h2>
              {detailProduct.description && (
                <p className="text-sm text-slate-500 leading-relaxed">{detailProduct.description}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <p className="text-2xl font-extrabold text-indigo-700">{formatCurrency(detailProduct.sale_price)}</p>
                {detailProduct.stock_quantity > 0 ? (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Em estoque
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    Indisponível
                  </span>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { toggleCart(detailProduct.id); setDetailProduct(null) }}
                  className={cn(
                    'flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors',
                    cart.includes(detailProduct.id)
                      ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700',
                  )}
                >
                  {cart.includes(detailProduct.id) ? 'Remover do orçamento' : 'Adicionar ao orçamento'}
                </button>
                <button onClick={() => setDetailProduct(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-slate-400">
        Catálogo digital criado com <span className="font-semibold text-indigo-500">Minha Ótica</span>
      </footer>
    </div>
  )
}
