import { describe, expect, it } from 'vitest';
import { calculateDiceParams } from '../utils/diceLogic';
import { rollUntilValid } from '../utils/roller';

function makeSeqRng(seq: number[]) {
  let i = 0;
  return () => {
    const v = seq[i];
    i++;
    return v ?? 1;
  };
}

describe('rollUntilValid', () => {
  it('maps a single d20 into an inclusive small range (1..6)', () => {
    const params = calculateDiceParams(1, 6, true, true); // N=6, k=1, Limit=18

    const r1 = rollUntilValid(params, makeSeqRng([1])); // raw=0
    expect(r1.finalResult).toBe(1);
    expect(r1.rerolls).toBe(0);

    const r6 = rollUntilValid(params, makeSeqRng([6])); // raw=5
    expect(r6.finalResult).toBe(6);
    expect(r6.rerolls).toBe(0);

    const wrap = rollUntilValid(params, makeSeqRng([7])); // raw=6 => 1 + (6 % 6) = 1
    expect(wrap.finalResult).toBe(1);
  });

  it('rerolls when rawValue >= Limit (rejection sampling)', () => {
    const params = calculateDiceParams(1, 6, true, true); // Limit=18 so raw 18/19 must reroll

    const outcome = rollUntilValid(params, makeSeqRng([20, 19, 1])); // raw=19 invalid, raw=18 invalid, raw=0 valid
    expect(outcome.finalResult).toBe(1);
    expect(outcome.rerolls).toBe(2);
  });

  it('supports multi-dice ranges (1..100) without rerolls when Limit covers full space', () => {
    const params = calculateDiceParams(1, 100, true, true); // k=2, Limit=400

    // raw = (6-1)*20 + (20-1) = 119 => 1 + (119 % 100) = 20
    const outcome = rollUntilValid(params, makeSeqRng([6, 20]));
    expect(outcome.diceValues).toEqual([6, 20]);
    expect(outcome.rawValue).toBe(119);
    expect(outcome.finalResult).toBe(20);
    expect(outcome.rerolls).toBe(0);
  });

  it('respects includeStart/includeEnd by shifting the effective range', () => {
    // Exclude start: effective range is 2..10 (inclusive)
    const params = calculateDiceParams(1, 10, false, true); // N=9, rangeMin=2

    const min = rollUntilValid(params, makeSeqRng([1])); // raw=0 => 2
    expect(min.finalResult).toBe(2);

    const max = rollUntilValid(params, makeSeqRng([9])); // raw=8 => 2 + 8 = 10
    expect(max.finalResult).toBe(10);

    // Exclude end: effective range is 1..9 (inclusive)
    const params2 = calculateDiceParams(1, 10, true, false); // N=9, rangeMin=1
    const max2 = rollUntilValid(params2, makeSeqRng([9])); // raw=8 => 1 + 8 = 9
    expect(max2.finalResult).toBe(9);
  });

  it('throws if the injected RNG returns values outside [1, 20]', () => {
    const params = calculateDiceParams(1, 6, true, true);
    expect(() => rollUntilValid(params, makeSeqRng([0]))).toThrow();
    expect(() => rollUntilValid(params, makeSeqRng([21]))).toThrow();
  });
});



