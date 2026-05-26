import { calculateScore, type ScoreInput, type ScoreResult } from '@solupaes/shared';

export function scoreVisit(input: ScoreInput): ScoreResult {
  return calculateScore(input);
}
