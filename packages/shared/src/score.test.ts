import { describe, expect, it } from 'vitest';
import { calculateScore, classify, proposeStrategies } from './score.js';

describe('calculateScore', () => {
  it('returns base score for empty input', () => {
    const result = calculateScore({
      worksWithFrozen: false,
      hasFacadePhoto: false,
      hasGps: false,
    });
    expect(result.score).toBe(50);
    expect(result.classification).toBe('B');
  });

  it('classifies high-volume cliente as A', () => {
    const result = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 60,
      currentPrice: 18,
      equipmentLent: ['Freezer'],
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.classification).toBe('A');
  });

  it('clamps score between 0 and 100', () => {
    const ridiculous = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 1000000,
      currentPrice: 99,
      equipmentLent: [],
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(ridiculous.score).toBeLessThanOrEqual(100);
  });

  it('rewards new-market clients (no frozen)', () => {
    const noFrozen = calculateScore({
      worksWithFrozen: false,
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(noFrozen.score).toBe(60);
    expect(noFrozen.classification).toBe('B');
  });

  it('rationale records each contribution', () => {
    const result = calculateScore({
      worksWithFrozen: true,
      dailyVolume: 40,
      currentPrice: 20,
      equipmentLent: ['Freezer'],
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(result.rationale.length).toBeGreaterThan(3);
  });
});

describe('classify', () => {
  it('A >= 75', () => expect(classify(75)).toBe('A'));
  it('B >= 50 < 75', () => expect(classify(60)).toBe('B'));
  it('C < 50', () => expect(classify(40)).toBe('C'));
});

describe('proposeStrategies', () => {
  it('proposes institutional pitch when no frozen', () => {
    const strategies = proposeStrategies({
      worksWithFrozen: false,
      hasFacadePhoto: true,
      hasGps: true,
    });
    expect(strategies.some((s) => s.type === 'INSTITUTIONAL_PITCH')).toBe(true);
    expect(strategies.some((s) => s.type === 'PRODUCT_DEMO')).toBe(true);
  });

  it('proposes equipment offer when client has < 3 equipments', () => {
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

  it('proposes price differentiation when price is high', () => {
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

  it('proposes bonification for high volume', () => {
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

  it('always proposes PRODUCT_DEMO when working with frozen', () => {
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
