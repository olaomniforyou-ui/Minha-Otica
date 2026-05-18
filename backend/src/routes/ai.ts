import { Router } from 'express'
import { GoogleGenAI } from '@google/genai'

const router = Router()
const genai  = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })

const SYSTEM_PROMPT = `Você é o Assistente Dono da Minha Ótica, um sistema de gestão para óticas brasileiras.
Você recebe dados reais do negócio e fornece análises concisas, insights práticos e recomendações acionáveis.
Responda SEMPRE em português do Brasil, de forma objetiva e direta — máximo 4 parágrafos curtos.
Foque no que o dono de ótica precisa saber para tomar boas decisões hoje.`

router.post('/assistant', async (req, res) => {
  const {
    revenue_today, sales_today, revenue_month, sales_month,
    pending_orders, lab_items, expenses_month,
    top_products, low_stock, defect_count,
    messages, // {role:'user'|'assistant'; content:string}[] para modo conversa
  } = req.body

  try {
    // Modo conversa: messages[] com histórico
    if (Array.isArray(messages) && messages.length > 0) {
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const systemTurn = { role: 'user', parts: [{ text: SYSTEM_PROMPT }] }
      const result = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [systemTurn, ...contents],
      })
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Não foi possível responder.'
      return res.json({ text })
    }

    // Modo análise inicial: dados de contexto
    const ctx = `
DADOS DO NEGÓCIO (hoje ${new Date().toLocaleDateString('pt-BR')}):
- Receita hoje: R$ ${(revenue_today ?? 0).toFixed(2)}
- Vendas hoje: ${sales_today ?? 0}
- Receita no mês: R$ ${(revenue_month ?? 0).toFixed(2)}
- Vendas no mês: ${sales_month ?? 0}
- OS pendentes/em produção: ${pending_orders ?? 0}
- Pedidos no laboratório (em aberto): ${lab_items ?? 0}
- Defeitos no laboratório: ${defect_count ?? 0}
- Despesas pagas no mês: R$ ${(expenses_month ?? 0).toFixed(2)}
- Produtos com estoque baixo: ${low_stock ?? 0}
- Top produtos do mês: ${top_products ?? 'não informado'}

Com base nesses dados, forneça:
1. Uma avaliação rápida do desempenho de hoje e do mês
2. Alertas sobre pontos de atenção (defeitos, estoque, lab)
3. Uma recomendação prática para o dono agir hoje`

    const result = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + ctx }] }],
    })
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Não foi possível gerar análise.'
    res.json({ text })
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return res.status(500).json({ error: 'Chave da API Gemini inválida ou não configurada.' })
    }
    res.status(500).json({ error: 'Erro ao consultar IA.' })
  }
})

// ── POST /insights ────────────────────────────────────────────────────────────
// Recebe dados agregados e retorna 5 insights de negócio estruturados como JSON
router.post('/insights', async (req, res) => {
  const {
    revenue_month, revenue_prev_month, sales_count, avg_ticket,
    top_products, payment_breakdown, patients_count, new_patients,
    os_pending, defect_count, expenses_month, nps_avg,
  } = req.body

  const growth = revenue_prev_month > 0
    ? (((revenue_month - revenue_prev_month) / revenue_prev_month) * 100).toFixed(1)
    : null

  const prompt = `Você é consultor especialista em gestão de óticas brasileiras. Analise os dados abaixo e retorne exatamente 5 insights acionáveis no formato JSON.

DADOS DO MÊS:
- Faturamento: R$ ${(revenue_month ?? 0).toFixed(2)} ${growth ? `(${growth > '0' ? '+' : ''}${growth}% vs mês anterior)` : ''}
- Vendas: ${sales_count ?? 0} | Ticket médio: R$ ${(avg_ticket ?? 0).toFixed(2)}
- Clientes ativos: ${patients_count ?? 0} | Novos este mês: ${new_patients ?? 0}
- OS pendentes: ${os_pending ?? 0} | Defeitos no lab: ${defect_count ?? 0}
- Despesas do mês: R$ ${(expenses_month ?? 0).toFixed(2)}
- NPS médio: ${nps_avg ?? 'não informado'}
- Top produtos: ${top_products ?? 'não informado'}
- Pagamentos: ${payment_breakdown ?? 'não informado'}

Retorne APENAS JSON válido, sem markdown, sem explicação extra, no formato:
[
  {"titulo":"...","corpo":"...","prioridade":"alta|media|baixa","tipo":"alerta|oportunidade|parabens|dica"},
  ...
]
Os 5 insights devem misturar análise, alertas e recomendações práticas.`

  try {
    const result = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    // Remove possível markdown ```json ... ```
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const insights = JSON.parse(clean)
    res.json({ insights })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao gerar insights.' })
  }
})

export default router
