import { useState } from 'react'
import { ChevronRight, HelpCircle, BookOpen, MessageCircle, Mail, MapPin, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SHORTCUT_LIST } from '@/hooks/useKeyboardShortcuts'

interface FaqItem { q: string; a: string }

const FAQS: { section: string; items: FaqItem[] }[] = [
  {
    section: 'Primeiros Passos',
    items: [
      { q: 'Como criar um novo Orçamento / OS?', a: 'No menu lateral, clique em "Orçamentos" ou use o atalho "+ Novo Orçamento / OS" na parte inferior da barra lateral. Preencha os dados do cliente, adicione os produtos e confirme.' },
      { q: 'Como cadastrar um paciente?', a: 'Acesse "Clientes" no menu lateral e clique em "Novo Cliente". Preencha os dados básicos (nome obrigatório) e salve. O cadastro funciona offline — os dados são sincronizados automaticamente quando a internet estiver disponível.' },
      { q: 'Como registrar uma venda no PDV?', a: 'Acesse "Vendas / PDV" no menu. Clique em "Nova Venda", selecione o paciente (opcional), adicione os produtos, informe a forma de pagamento e confirme. O estoque é atualizado automaticamente.' },
    ],
  },
  {
    section: 'Laboratório',
    items: [
      { q: 'Como enviar um pedido para o laboratório?', a: 'Em uma Ordem de Serviço aprovada, clique em "Enviar ao Lab". O pedido aparecerá na página "Laboratório" com status "Aguardando Envio". Avance as etapas conforme o andamento do pedido.' },
      { q: 'Como avisar o cliente que o óculos está pronto?', a: 'Na página Laboratório, quando o status for "Pronto p/ Retorno", aparecerá o botão "Avisar Cliente" que abre uma mensagem pré-pronta no WhatsApp.' },
      { q: 'O que significa o indicador de dias no laboratório?', a: 'Mostra quantos dias o pedido está em produção. Amarelo significa que o prazo de retorno está próximo (≤ 2 dias); vermelho indica que o prazo já venceu.' },
    ],
  },
  {
    section: 'Financeiro',
    items: [
      { q: 'Como importar extrato bancário (OFX)?', a: 'Acesse "Financeiro" → aba "Conciliação OFX" → clique em "Importar OFX". Selecione o arquivo do seu banco (disponível no Internet Banking → Extrato). Após importar, vincule as transações às despesas e vendas.' },
      { q: 'Como funciona o DRE?', a: 'Em "Relatórios & Analytics", clique na aba "DRE". Selecione o período (mês, trimestre, ano). Ajuste o CMV estimado com o slider. O sistema calcula Receita Líquida, Lucro Bruto e Resultado Operacional automaticamente.' },
      { q: 'Como gerenciar comissões dos vendedores?', a: 'Acesse "Comissões" no menu. Defina o percentual por vendedor e visualize as metas mensais. O relatório mostra performance individual, ranking e total a pagar no período.' },
    ],
  },
  {
    section: 'Modo Offline',
    items: [
      { q: 'O sistema funciona sem internet?', a: 'Sim. As funcionalidades principais (cadastros, vendas, OS, estoque) funcionam offline. Os dados são armazenados localmente no dispositivo e sincronizados automaticamente com o servidor quando a conexão for restabelecida.' },
      { q: 'Como sei se há dados pendentes de sincronização?', a: 'Um indicador de "Sincronizando..." aparece temporariamente no sistema. Você pode forçar a sincronização clicando no botão "Sincronizar" disponível em várias páginas.' },
    ],
  },
  {
    section: 'Convênios',
    items: [
      { q: 'Como cadastrar um convênio?', a: 'Acesse "Convênios" no menu. Clique em "Novo Convênio", preencha nome, tipo, percentual de desconto e dados de contato. O convênio ficará disponível como forma de pagamento nas vendas.' },
      { q: 'Como registrar uma autorização de convênio?', a: 'Na página Convênios, acesse a aba "Autorizações" e clique em "Nova Autorização". Vincule ao paciente e convênio, informe o número de autorização e período de validade.' },
      { q: 'Como ver o faturamento por convênio?', a: 'Na página Convênios, acesse a aba "Faturamento". Selecione o período desejado para ver todas as vendas realizadas via convênio, agrupadas por paciente, com opção de exportar para CSV.' },
    ],
  },
]

function AccordionItem({ q, a }: FaqItem) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start gap-3 py-4 text-left"
      >
        <ChevronRight
          size={16}
          className={cn('mt-0.5 flex-shrink-0 text-slate-400 transition-transform', open && 'rotate-90')}
        />
        <span className="text-sm font-semibold text-slate-800">{q}</span>
      </button>
      {open && (
        <div className="pb-4 pl-7 pr-2 text-sm text-slate-600 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? FAQS.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.q.toLowerCase().includes(search.toLowerCase()) ||
          i.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : FAQS

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle size={24} className="text-blue-500" />
          Central de Ajuda
        </h1>
        <p className="text-sm text-slate-500 mt-1">Dúvidas frequentes e guias de uso do Minha Ótica</p>
      </div>

      {/* Tour Interativo */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-start gap-3">
          <MapPin size={20} className="text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Tour interativo pelo sistema</p>
            <p className="text-xs text-slate-500 mt-0.5">Deixa a gente te mostrar as principais funcionalidades em 8 passos.</p>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('start-tour'))}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <MapPin size={14} /> Iniciar Tour
        </button>
      </div>

      {/* Atalhos de Teclado */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Keyboard size={14} className="text-slate-500" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Atalhos de Teclado</p>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">Use atalhos para navegar rapidamente. Os atalhos de navegação funcionam quando o cursor não está em um campo de texto.</p>
          {(['Navegação', 'Global'] as const).map(cat => {
            const items = SHORTCUT_LIST.filter(s => s.category === cat)
            return (
              <div key={cat}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{cat}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {items.map(s => (
                    <div key={s.keys} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-xs text-slate-700">{s.action}</span>
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 shadow-sm whitespace-nowrap">
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar dúvida..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Nenhuma resposta encontrada para "{search}".</p>
        ) : (
          filtered.map(section => (
            <div key={section.section} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{section.section}</p>
              </div>
              <div className="px-5">
                {section.items.map(item => (
                  <AccordionItem key={item.q} {...item} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contato */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-start gap-3">
          <MessageCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Não encontrou o que precisava?</p>
            <p className="text-xs text-slate-500 mt-0.5">Entre em contato pelo e-mail de suporte.</p>
          </div>
        </div>
        <a
          href="mailto:suporte@minhaotica.com.br"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Mail size={14} /> Contato
        </a>
      </div>
    </div>
  )
}
