import type { Request, Response } from 'express'
import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })

const PROMPT = `Você é um especialista em leitura de receitas ópticas brasileiras.
Extraia os dados da receita da imagem e retorne SOMENTE um JSON válido, sem markdown, sem texto extra.

Formato esperado:
{
  "od_esf": número ou null,
  "od_cil": número ou null,
  "od_eixo": número inteiro ou null,
  "od_add": número ou null,
  "od_dnp": número ou null,
  "od_altura": número inteiro ou null,
  "oe_esf": número ou null,
  "oe_cil": número ou null,
  "oe_eixo": número inteiro ou null,
  "oe_add": número ou null,
  "oe_dnp": número ou null,
  "oe_altura": número inteiro ou null,
  "doctor_name": string ou null,
  "crm": string ou null,
  "exam_date": "YYYY-MM-DD" ou null
}

Regras:
- OD = Olho Direito (Right/R), OE = Olho Esquerdo (Left/L/LE/OS)
- Esf e Cil podem ser negativos (ex: -2.50, +1.00)
- Eixo é sempre inteiro entre 0 e 180
- Add (adição) é sempre positiva
- Se um campo não estiver visível ou ilegível, use null
- Não invente valores — só extraia o que está claramente visível`

export async function extractPrescription(req: Request, res: Response) {
  const { image, mediaType } = req.body as { image?: string; mediaType?: string }

  if (!image) {
    return res.status(400).json({ error: 'Campo "image" (base64) é obrigatório.' })
  }

  const mimeType = (mediaType ?? 'image/jpeg') as string

  try {
    const result = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: image } },
            { text: PROMPT },
          ],
        },
      ],
    })

    const text = result.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Não foi possível extrair dados da receita da imagem.' })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return res.json({ data: parsed })
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return res.status(500).json({ error: 'Chave da API Gemini inválida ou não configurada.' })
    }
    throw err
  }
}
