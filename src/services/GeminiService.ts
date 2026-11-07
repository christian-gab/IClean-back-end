import { GoogleGenAI } from '@google/genai'

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

export interface PhotoValidationResult {
  approved: boolean
  confidence: number // 0–1
  reasoning: string
  detectedElements: string[]
  warnings: string[]
}

function buildPrompt(actionTitle: string, actionDescription: string, userDescription?: string): string {
  return `Você é um sistema de validação de ações sustentáveis para o aplicativo IClean.

Analise esta imagem e verifique se ela comprova a seguinte ação sustentável:
- **Ação:** ${actionTitle}
- **Descrição:** ${actionDescription}
${userDescription ? `- **Relato do usuário:** ${userDescription}` : ''}

Critérios de análise:
1. A imagem é autêntica (não é screenshot, imagem da internet ou editada digitalmente)?
2. A imagem mostra elementos compatíveis com a ação descrita?
3. Existe algum indício de manipulação ou fraude?
4. A imagem é de qualidade mínima suficiente para validação?

Responda SOMENTE em formato JSON válido, sem markdown, sem explicações extras:
{
  "approved": boolean,
  "confidence": número entre 0 e 1,
  "reasoning": "explicação em português de até 2 frases",
  "detectedElements": ["elemento1", "elemento2"],
  "warnings": ["aviso1"]
}`
}

export async function validatePhotoWithGemini(
  imageBase64: string,
  actionTitle: string,
  actionDescription: string,
  userDescription?: string
): Promise<PhotoValidationResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada. Defina no arquivo .env')
  }

  // Remove o prefixo data:image/...;base64, se houver
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/)
  const mimeType = (mimeMatch?.[1] ?? 'image/jpeg') as string

  const ai = new GoogleGenAI({ apiKey })

  const prompt = buildPrompt(actionTitle, actionDescription, userDescription)

  const preferredModel = process.env.GEMINI_MODEL
  const modelsToTry = [
    preferredModel,
    ...CANDIDATE_MODELS.filter(m => m !== preferredModel),
  ].filter(Boolean) as string[]

  let lastError: unknown = null

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      })

      const text = response.text?.trim() ?? ''

      // Extrai JSON mesmo que venha com backticks de markdown
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error(`Resposta do Gemini não contém JSON válido. Resposta: ${text.slice(0, 200)}`)
      }

      const parsed = JSON.parse(jsonMatch[0]) as PhotoValidationResult

      return {
        approved: Boolean(parsed.approved),
        confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
        reasoning: parsed.reasoning ?? 'Análise concluída.',
        detectedElements: Array.isArray(parsed.detectedElements) ? parsed.detectedElements : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      }
    } catch (err: any) {
      lastError = err
      console.warn(`[GeminiService] Modelo ${model} falhou (${err?.status || err?.message || 'erro'}). Tentando próximo modelo...`)
      if (model !== modelsToTry[modelsToTry.length - 1]) {
        continue
      }
      throw err
    }
  }

  throw lastError
}