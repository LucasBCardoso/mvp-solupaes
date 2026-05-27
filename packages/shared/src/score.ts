/**
 * Solupães — Score de Viabilidade Comercial
 *
 * Calcula um score 0-100 para cada visita registrada, com base nos critérios
 * comerciais da Ouro Pães. Ver docs/SCORE_ENGINE.md para a explicação completa.
 *
 * ─── Duas trilhas ─────────────────────────────────────────────────────────
 *
 * TRILHA A — Cliente ATIVO (worksWithFrozen=true)         Máximo: 100 pts
 *   1. Volume diário do PDV                                   até  40 pts
 *   2. Preço pago ao concorrente vs nosso preço de referência até  25 pts
 *   3. Equipamentos do concorrente em comodato                até  15 pts
 *   4. Qualidade do registro (foto + GPS)                     até  20 pts
 *
 * TRILHA B — PROSPECT (worksWithFrozen=false)              Máximo:  65 pts
 *   1. Base mercado novo                                          50 pts
 *   2. Foto da fachada                                            10 pts
 *   3. GPS capturado                                               5 pts
 *
 *   → Prospect nunca passa de 65 sozinho. Sempre cai em Classe B
 *     até o gestor reclassificar manualmente após follow-up.
 *
 * ─── Classificação ───────────────────────────────────────────────────────
 *
 *   75-100 → A   (priorizar visita imediata)
 *   50-74  → B   (planejar 30 dias)
 *    0-49  → C   (relacionamento longo)
 */

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

// ─── Tabela de pontos (ajuste aqui para recalibrar o engine) ──────────────

export const SCORE_RULES = {
  // Trilha A
  volume: {
    tier1: { gte: 80, points: 40 },
    tier2: { gte: 50, points: 30 },
    tier3: { gte: 20, points: 20 },
    tier4: { gte: 1,  points: 10 },
  },
  priceVsReference: {
    veryHigh: { ratioGt: 1.2, points: 25 },
    high:     { ratioGt: 1.1, points: 18 },
    above:    { ratioGt: 1.0, points: 12 },
    belowOrEqual:           { points: 5 },
  },
  competitorEquipment: {
    none:  { count: 0, points: 15 },
    few:   { upTo: 2, points: 10 },
    some:  { upTo: 4, points: 5 },
    many:                { points: 0 },
  },
  activeClientFacadePhoto: 10,
  activeClientGps: 10,

  // Trilha B
  prospectBase: 50,
  prospectFacadePhoto: 10,
  prospectGps: 5,
} as const;

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

export function calculateScore(input: ScoreInput): ScoreResult {
  return input.worksWithFrozen ? scoreActiveClient(input) : scoreProspect(input);
}

function scoreActiveClient(input: ScoreInput): ScoreResult {
  const rationale: string[] = [];
  let score = 0;

  // 1. Volume diário (até 40 pts) — fator dominante segundo Ouro Pães
  const volume = input.dailyVolume ?? 0;
  let volumePts = 0;
  if (volume >= SCORE_RULES.volume.tier1.gte)       volumePts = SCORE_RULES.volume.tier1.points;
  else if (volume >= SCORE_RULES.volume.tier2.gte)  volumePts = SCORE_RULES.volume.tier2.points;
  else if (volume >= SCORE_RULES.volume.tier3.gte)  volumePts = SCORE_RULES.volume.tier3.points;
  else if (volume >= SCORE_RULES.volume.tier4.gte)  volumePts = SCORE_RULES.volume.tier4.points;
  score += volumePts;
  rationale.push(`Volume diário ${volume} un → +${volumePts} pts`);

  // 2. Preço do concorrente vs nosso preço de referência (até 25 pts)
  const price = input.currentPrice ?? 0;
  let pricePts = 0;
  if (price > 0) {
    const ratio = price / REFERENCE_PRICE_PER_UNIT;
    if (ratio > SCORE_RULES.priceVsReference.veryHigh.ratioGt)   pricePts = SCORE_RULES.priceVsReference.veryHigh.points;
    else if (ratio > SCORE_RULES.priceVsReference.high.ratioGt)  pricePts = SCORE_RULES.priceVsReference.high.points;
    else if (ratio > SCORE_RULES.priceVsReference.above.ratioGt) pricePts = SCORE_RULES.priceVsReference.above.points;
    else                                                          pricePts = SCORE_RULES.priceVsReference.belowOrEqual.points;
  }
  score += pricePts;
  rationale.push(
    `Preço atual R$ ${price.toFixed(2)} (ref R$ ${REFERENCE_PRICE_PER_UNIT.toFixed(2)}) → +${pricePts} pts`,
  );

  // 3. Equipamentos do concorrente em comodato (até 15 pts) — quanto menos, mais oportunidade
  const equipCount = input.equipmentLent?.length ?? 0;
  let equipPts = 0;
  if (equipCount === SCORE_RULES.competitorEquipment.none.count)      equipPts = SCORE_RULES.competitorEquipment.none.points;
  else if (equipCount <= SCORE_RULES.competitorEquipment.few.upTo)    equipPts = SCORE_RULES.competitorEquipment.few.points;
  else if (equipCount <= SCORE_RULES.competitorEquipment.some.upTo)   equipPts = SCORE_RULES.competitorEquipment.some.points;
  else                                                                 equipPts = SCORE_RULES.competitorEquipment.many.points;
  score += equipPts;
  rationale.push(`Equipamentos do concorrente: ${equipCount} → +${equipPts} pts`);

  // 4. Qualidade do registro (até 20 pts)
  let qualityPts = 0;
  if (input.hasFacadePhoto) qualityPts += SCORE_RULES.activeClientFacadePhoto;
  if (input.hasGps)         qualityPts += SCORE_RULES.activeClientGps;
  score += qualityPts;
  rationale.push(`Registro (foto/GPS) → +${qualityPts} pts`);

  const finalScore = clamp(score, 0, 100);
  return { score: finalScore, classification: classify(finalScore), rationale };
}

function scoreProspect(input: ScoreInput): ScoreResult {
  const rationale: string[] = ['Cliente ainda não trabalha com congelados (mercado novo)'];
  let score = SCORE_RULES.prospectBase;
  rationale.push(`Base mercado novo → +${SCORE_RULES.prospectBase} pts`);

  if (input.hasFacadePhoto) {
    score += SCORE_RULES.prospectFacadePhoto;
    rationale.push(`Foto da fachada → +${SCORE_RULES.prospectFacadePhoto} pts`);
  }
  if (input.hasGps) {
    score += SCORE_RULES.prospectGps;
    rationale.push(`GPS → +${SCORE_RULES.prospectGps} pts`);
  }

  const finalScore = clamp(score, 0, 100);
  return { score: finalScore, classification: classify(finalScore), rationale };
}

export function classify(score: number): Classification {
  if (score >= CLASSIFICATION_THRESHOLDS.A) return 'A';
  if (score >= CLASSIFICATION_THRESHOLDS.B) return 'B';
  return 'C';
}

// ─── Strategy Engine ──────────────────────────────────────────────────────

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
      description:
        `Cliente possui apenas ${equipCount} equipamento(s) do concorrente. ` +
        `Propor reposição/complemento (forno, armário de crescimento, freezer) para ampliar capacidade.`,
      followUpDays: 15,
    });
  }

  if ((input.currentPrice ?? 0) > REFERENCE_PRICE_PER_UNIT) {
    proposals.push({
      type: 'PRICE_DIFFERENTIATION',
      title: 'Oferta de preço competitivo',
      description:
        `Preço atual (R$ ${input.currentPrice?.toFixed(2)}) acima da referência ` +
        `(R$ ${REFERENCE_PRICE_PER_UNIT.toFixed(2)}). Propor tabela diferenciada por volume.`,
      followUpDays: 7,
    });
  }

  const volume = input.dailyVolume ?? 0;
  if (volume >= 30) {
    proposals.push({
      type: 'BONIFICATION',
      title: 'Programa de bonificação por volume',
      description:
        `Cliente com volume alto (${volume}/dia). Estruturar bonificação em pães ` +
        `para reduzir custo unitário e melhorar competitividade local.`,
      followUpDays: 15,
    });
  }

  proposals.push({
    type: 'PRODUCT_DEMO',
    title: 'Demonstração de produtos no PDV',
    description:
      'Sempre incluir demonstração: principais SKUs, ação de degustação, suporte do representante.',
    followUpDays: 30,
  });

  return proposals;
}

export function followupForRejection(
  reason: 'no_interest' | 'tied_to_supplier' | 'other',
): number {
  if (reason === 'no_interest') return 180;
  if (reason === 'tied_to_supplier') return 90;
  return 60;
}
