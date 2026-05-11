import type { Request, Response } from 'express'
import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })

const PROMPT = `Você é um especialista em leitura de documentos brasileiros (RG, CNH, CPF, passaporte).
Extraia os dados pessoais do documento na imagem e retorne SOMENTE um JSON válido, sem markdown, sem texto extra.

Formato esperado:
{
  "full_name": string ou null,
  "cpf": string ou null,
  "rg": string ou null,
  "birth_date": "YYYY-MM-DD" ou null,
  "gender": "M" ou "F" ou null
}

Regras:
- full_name: nome completo em letras maiúsculas como aparece no documento
- cpf: formato 000.000.000-00
- rg: apenas os dígitos e traços, sem pontos de milhares
- birth_date: converta qualquer formato para YYYY-MM-DD
- gender: M para Masculino/MASC/M, F para Feminino/FEM/F — null se não aparecer
- Se um campo não estiver visível ou ilegível, use null
- Não invente valores — só extraia o que está claramente visível`

export async function extractDocument(req: Request, res: Response) {
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
      return res.status(422).json({ error: 'Não foi possível extrair dados do documento.' })
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
