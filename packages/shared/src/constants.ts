export const ROLES = ['ADMIN', 'GESTOR', 'REPRESENTANTE'] as const;
export type Role = (typeof ROLES)[number];

export const CLASSIFICATIONS = ['A', 'B', 'C'] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const VISIT_STATUSES = ['SYNCED', 'PENDING_REVIEW', 'ARCHIVED'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const STRATEGY_TYPES = [
  'EQUIPMENT_OFFER',
  'PRICE_DIFFERENTIATION',
  'BONIFICATION',
  'PRODUCT_DEMO',
  'RELATIONSHIP_FOLLOWUP',
  'INSTITUTIONAL_PITCH',
] as const;
export type StrategyType = (typeof STRATEGY_TYPES)[number];

export const STRATEGY_STATUSES = [
  'PROPOSED',
  'IN_PROGRESS',
  'WON',
  'LOST',
  'POSTPONED',
] as const;
export type StrategyStatus = (typeof STRATEGY_STATUSES)[number];

export const OURO_PAES_EQUIPMENT = [
  'Forno',
  'Armário de Crescimento',
  'Telas/Formas',
  'Câmara Climática',
  'Freezer',
] as const;

export const REFERENCE_PRICE_PER_UNIT = 14.5;

export const CLASSIFICATION_THRESHOLDS = { A: 75, B: 50 } as const;

export const STRATEGY_LABELS_PT: Record<StrategyType, string> = {
  EQUIPMENT_OFFER: 'Oferta de equipamentos',
  PRICE_DIFFERENTIATION: 'Diferenciação de preço',
  BONIFICATION: 'Bonificação em pães',
  PRODUCT_DEMO: 'Demonstração de produtos',
  RELATIONSHIP_FOLLOWUP: 'Retorno futuro (relacionamento)',
  INSTITUTIONAL_PITCH: 'Apresentação institucional Ouro Pães',
};

export const STRATEGY_STATUS_LABELS_PT: Record<StrategyStatus, string> = {
  PROPOSED: 'Proposta',
  IN_PROGRESS: 'Em andamento',
  WON: 'Convertido',
  LOST: 'Não convertido',
  POSTPONED: 'Adiado',
};
