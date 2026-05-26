import {
  CLASSIFICATION_THRESHOLDS,
  REFERENCE_PRICE_PER_UNIT,
  type Classification,
  type StrategyType,
} from './constants.js';

export interface ScoreInput {
  worksWithFrozen: boolean;
  dailyVolume?: number | null;
  currentPrice?: number | null;
  equipmentLent?: string[] | null;
  hasFacadePhoto: boolean;
  hasGps: boolean;
}

export interface ScoreResult {
  score: number;
  classification: Classification;
  rationale: string[];
}

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

export function calculateScore(input: ScoreInput): ScoreResult {
  const rationale: string[] = [];
  let score = 20;
  rationale.push(`Base: 20`);

  if (input.worksWithFrozen) {
    const volumeBonus = Math.min(40, Math.max(0, (input.dailyVolume ?? 0) * 0.8));
    score += volumeBonus;
    rationale.push(`Volume diário (${input.dailyVolume ?? 0}): +${volumeBonus.toFixed(0)}`);

    const priceHigh = (input.currentPrice ?? 0) > REFERENCE_PRICE_PER_UNIT;
    score += priceHigh ? 15 : 5;
    rationale.push(
      priceHigh
        ? `Preço atual > referência (R$ ${REFERENCE_PRICE_PER_UNIT}): +15`
        : `Preço atual ≤ referência: +5`,
    );

    const equipCount = input.equipmentLent?.length ?? 0;
    if (equipCount < 3) {
      score += 10;
      rationale.push(`Poucos equipamentos (${equipCount}/5): +10 (oportunidade)`);
    }
  } else {
    score += 30;
    rationale.push(`Mercado novo (não trabalha com congelados): +30 (potencial)`);
  }

  if (input.hasFacadePhoto) {
    score += 5;
    rationale.push(`Foto da fachada capturada: +5`);
  }
  if (input.hasGps) {
    score += 5;
    rationale.push(`GPS capturado: +5`);
  }

  const finalScore = clamp(Math.round(score), 0, 100);
  const classification = classify(finalScore);

  return { score: finalScore, classification, rationale };
}

export function classify(score: number): Classification {
  if (score >= CLASSIFICATION_THRESHOLDS.A) return 'A';
  if (score >= CLASSIFICATION_THRESHOLDS.B) return 'B';
  return 'C';
}

export interface StrategyProposal {
  type: StrategyType;
  title: string;
  description: string;
  followUpDays?: number;
}

export function proposeStrategies(input: ScoreInput): StrategyProposal[] {
  const proposals: StrategyProposal[] = [];

  if (!input.worksWithFrozen) {
    proposals.push({
      type: 'INSTITUTIONAL_PITCH',
      title: 'Apresentação institucional Ouro Pães',
      description:
        'Cliente ainda não trabalha com panificação congelada. Apresentar institucional ' +
        '(vídeo + catálogo) e propor degustação dos principais produtos.',
      followUpDays: 14,
    });
    proposals.push({
      type: 'PRODUCT_DEMO',
      title: 'Demonstração de produtos com degustação',
      description:
        'Agendar visita técnica com amostras (pão francês, pão de queijo, salgados). ' +
        'Demonstrar margem e giro esperado.',
      followUpDays: 30,
    });
    return proposals;
  }

  const equipCount = input.equipmentLent?.length ?? 0;
  if (equipCount < 3) {
    proposals.push({
      type: 'EQUIPMENT_OFFER',
      title: 'Ofertar equipamentos em comodato',
      description: `Cliente possui apenas ${equipCount} equipamento(s) do concorrente. ` +
        `Propor reposição/complemento (forno, armário de crescimento, freezer) para ampliar capacidade.`,
      followUpDays: 15,
    });
  }

  if ((input.currentPrice ?? 0) > REFERENCE_PRICE_PER_UNIT) {
    proposals.push({
      type: 'PRICE_DIFFERENTIATION',
      title: 'Oferta de preço competitivo',
      description: `Preço atual (R$ ${input.currentPrice?.toFixed(2)}) acima da referência ` +
        `(R$ ${REFERENCE_PRICE_PER_UNIT.toFixed(2)}). Propor tabela diferenciada por volume.`,
      followUpDays: 7,
    });
  }

  const volume = input.dailyVolume ?? 0;
  if (volume >= 30) {
    proposals.push({
      type: 'BONIFICATION',
      title: 'Programa de bonificação por volume',
      description: `Cliente com volume alto (${volume}/dia). Estruturar bonificação em pães ` +
        `para reduzir custo unitário e melhorar competitividade local.`,
      followUpDays: 15,
    });
  }

  proposals.push({
    type: 'PRODUCT_DEMO',
    title: 'Demonstração de produtos no PDV',
    description: 'Sempre incluir demonstração: principais SKUs, ação de degustação, suporte do representante.',
    followUpDays: 30,
  });

  return proposals;
}

export function followupForRejection(reason: 'no_interest' | 'tied_to_supplier' | 'other'): number {
  if (reason === 'no_interest') return 180;
  if (reason === 'tied_to_supplier') return 90;
  return 60;
}
