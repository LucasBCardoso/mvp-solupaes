import { describe, expect, it } from 'vitest';
import { calculateScore, classify, proposeStrategies } from './score.js';

describe('calculateScore — Trilha A (cliente ativo)', () => {
  it('máximo: volume alto + preço muito acima + sem equipamentos + foto + GPS', () => {
    const r = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 80,        // 40
      currentPrice: 18,       // ratio 1.24 → 25
      equipmentLent: [],      // 15
      hasFacadePhoto: true,   // 10
      hasGps: true,           // 10
    });
    expect(r.score).toBe(100);
    expect(r.classification).toBe('A');
  });

  it('Classe A típica: oportunidade clara', () => {
    const r = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 28,             // 20
      currentPrice: 17.5,          // ratio 1.21 → 25
      equipmentLent: ['Freezer'],  // 10
      hasFacadePhoto: true,        // 10
      hasGps: true,                // 10
    });
    expect(r.score).toBe(75);
    expect(r.classification).toBe('A');
  });

  it('Classe B típica: cliente bem equipado pelo concorrente', () => {
    const r = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 50,                                       // 30
      currentPrice: 14.5,                                    // ratio 1.0 → 5 (não passa de 1.0)
      equipmentLent: ['Forno', 'Câmara', 'Freezer'],         // 5
      hasFacadePhoto: true,                                  // 10
      hasGps: true,                                          // 10
    });
    expect(r.score).toBe(60);
    expect(r.classification).toBe('B');
  });

  it('Classe C: volume baixo, sem registro qualitativo', () => {
    const r = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 5,              // 10
      currentPrice: 14,            // ratio 0.97 → 5
      equipmentLent: ['Freezer'],  // 10
      hasFacadePhoto: false,       // 0
      hasGps: false,               // 0
    });
    expect(r.score).toBe(25);
    expect(r.classification).toBe('C');
  });

  it('clamp em 100 com valores absurdos', () => {
    const r = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 9999,
      currentPrice: 9999,
      equipmentLent: [],
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('rationale lista cada contribuição', () => {
    const r = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 40,
      currentPrice: 16,
      equipmentLent: ['Freezer'],
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(r.rationale).toHaveLength(4); // volume, preço, equipamentos, registro
  });
});

describe('calculateScore — Trilha B (prospect)', () => {
  it('máximo do prospect: 65 (sempre B até gestor reclassificar)', () => {
    const r = calculateScore({
      worksWithFrozen: false,
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(r.score).toBe(65);
    expect(r.classification).toBe('B');
  });

  it('base mercado novo sem foto/GPS = 50', () => {
    const r = calculateScore({
      worksWithFrozen: false,
      hasFacadePhoto: false,
      hasGps: false,
    });
    expect(r.score).toBe(50);
    expect(r.classification).toBe('B');
  });

  it('apenas foto: 60', () => {
    const r = calculateScore({
      worksWithFrozen: false,
      hasFacadePhoto: true,
      hasGps: false,
    });
    expect(r.score).toBe(60);
    expect(r.classification).toBe('B');
  });
});

describe('classify', () => {
  it('A começa em 75', () => expect(classify(75)).toBe('A'));
  it('B em 60', () => expect(classify(60)).toBe('B'));
  it('B em 50 (limite inferior)', () => expect(classify(50)).toBe('B'));
  it('C em 49', () => expect(classify(49)).toBe('C'));
});

describe('proposeStrategies', () => {
  it('prospect → INSTITUTIONAL_PITCH + PRODUCT_DEMO', () => {
    const strategies = proposeStrategies({
      worksWithFrozen: false,
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(strategies.some((s) => s.type === 'INSTITUTIONAL_PITCH')).toBe(true);
    expect(strategies.some((s) => s.type === 'PRODUCT_DEMO')).toBe(true);
  });

  it('cliente com poucos equipamentos → EQUIPMENT_OFFER', () => {
    const strategies = proposeStrategies({
      worksWithFrozen: true,
      dailyVolume: 20,
      currentPrice: 16,
      equipmentLent: ['Freezer'],
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(strategies.some((s) => s.type === 'EQUIPMENT_OFFER')).toBe(true);
  });

  it('preço alto → PRICE_DIFFERENTIATION', () => {
    const strategies = proposeStrategies({
      worksWithFrozen: true,
      dailyVolume: 20,
      currentPrice: 25,
      equipmentLent: ['Forno', 'Câmara Climática', 'Freezer'],
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(strategies.some((s) => s.type === 'PRICE_DIFFERENTIATION')).toBe(true);
  });

  it('volume alto → BONIFICATION', () => {
    const strategies = proposeStrategies({
      worksWithFrozen: true,
      dailyVolume: 50,
      currentPrice: 14,
      equipmentLent: ['Forno', 'Freezer', 'Armário'],
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(strategies.some((s) => s.type === 'BONIFICATION')).toBe(true);
  });

  it('PRODUCT_DEMO é proposto sempre para clientes ativos', () => {
    const strategies = proposeStrategies({
      worksWithFrozen: true,
      dailyVolume: 10,
      currentPrice: 14,
      equipmentLent: ['Forno', 'Câmara', 'Freezer'],
      hasFacadePhoto: false,
      hasGps: false,
    });
    expect(strategies.some((s) => s.type === 'PRODUCT_DEMO')).toBe(true);
  });
});
