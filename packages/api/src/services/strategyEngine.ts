import {
  proposeStrategies,
  type ScoreInput,
  type StrategyProposal,
} from '@solupaes/shared';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

export interface StrategyContext extends ScoreInput {
  fantasyName: string;
  city?: string | null;
  observations?: string | null;
  viabilityScore: number;
}

export async function generateStrategies(
  context: StrategyContext,
): Promise<Array<StrategyProposal & { generatedByAi: boolean }>> {
  const base = proposeStrategies(context).map((p) => ({ ...p, generatedByAi: false }));

  if (!env.ENABLE_AI_STRATEGY || !env.GEMINI_API_KEY) {
    return base;
  }

  try {
    const enriched = await enrichWithGemini(context, base);
    return enriched;
  } catch (err) {
    logger.warn({ err }, 'Falha ao enriquecer estratégias com IA, devolvendo regras base');
    return base;
  }
}

async function enrichWithGemini(
  context: StrategyContext,
  base: Array<StrategyProposal & { generatedByAi: boolean }>,
): Promise<Array<StrategyProposal & { generatedByAi: boolean }>> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  const prompt = `Você é um especialista comercial da Ouro Pães (panificação congelada).
Refine as estratégias abaixo para tornar a descrição mais persuasiva e contextualizada ao cliente.
Mantenha curto (até 280 caracteres por descrição), em português brasileiro, foco em ação.

Contexto do cliente:
- Nome: ${context.fantasyName}
- Cidade: ${context.city ?? 'n/a'}
- Trabalha com congelados: ${context.worksWithFrozen ? 'sim' : 'não'}
- Volume diário: ${context.dailyVolume ?? 'n/a'}
- Preço atual: R$ ${context.currentPrice ?? 'n/a'}
- Equipamentos do concorrente: ${(context.equipmentLent ?? []).join(', ') || 'nenhum'}
- Observações: ${context.observations ?? 'nenhuma'}
- Score: ${context.viabilityScore}/100

Estratégias-base:
${base.map((b, i) => `${i + 1}. [${b.type}] ${b.title}: ${b.description}`).join('\n')}

Devolva JSON estrito no formato:
[{"type":"...","title":"...","description":"..."}]
Sem markdown, sem texto adicional. Use os MESMOS tipos da entrada.`;

  const result = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
  });

  const text = result.text ?? '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return base;

  const refined = JSON.parse(jsonMatch[0]) as Array<{
    type: StrategyProposal['type'];
    title: string;
    description: string;
  }>;

  return base.map((b) => {
    const match = refined.find((r) => r.type === b.type);
    if (!match) return b;
    return { ...b, title: match.title, description: match.description, generatedByAi: true };
  });
}
