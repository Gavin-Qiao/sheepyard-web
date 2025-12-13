import { calculateFinalResult, calculateRawValue, DiceMathResult, isValidRoll } from './diceLogic';

export interface RollOutcome {
  diceValues: number[];
  rawValue: number;
  finalResult: number;
  rerolls: number;
}

export type D20Rng = () => number; // must return an integer in [1, 20]

function d20FromCrypto(): number {
  // Rejection sampling to avoid modulo bias.
  // 240 is the largest multiple of 20 <= 255.
  const buf = new Uint8Array(1);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    crypto.getRandomValues(buf);
    const x = buf[0];
    if (x < 240) return (x % 20) + 1;
  }
}

export function defaultD20(): number {
  // Prefer CSPRNG in the browser.
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return d20FromCrypto();
  }
  // Fallback (non-cryptographic).
  return 1 + Math.floor(Math.random() * 20);
}

function assertValidD20(n: number): asserts n is number {
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    throw new Error(`D20 RNG must return an integer in [1, 20]. Got: ${String(n)}`);
  }
}

/**
 * Rolls k d20s until the derived raw value is < Limit (rejection sampling),
 * then maps uniformly to the configured output range.
 */
export function rollUntilValid(params: DiceMathResult, rng: D20Rng = defaultD20): RollOutcome {
  const { k, Limit, N, rangeMin } = params;

  if (!Number.isInteger(k) || k < 1) throw new Error(`Invalid k: ${String(k)}`);
  if (!Number.isFinite(Limit) || Limit <= 0) throw new Error(`Invalid Limit: ${String(Limit)}`);
  if (!Number.isFinite(N) || N <= 0) throw new Error(`Invalid N: ${String(N)}`);

  let rerolls = 0;
  // Hard safety cap to avoid infinite loops if params are wrong.
  for (let attempt = 0; attempt < 10000; attempt++) {
    const diceValues: number[] = [];
    for (let i = 0; i < k; i++) {
      const v = rng();
      assertValidD20(v);
      diceValues.push(v);
    }

    const rawValue = calculateRawValue(diceValues);
    if (!isValidRoll(rawValue, Limit)) {
      rerolls++;
      continue;
    }

    const finalResult = calculateFinalResult(rawValue, N, rangeMin);
    return { diceValues, rawValue, finalResult, rerolls };
  }

  throw new Error('Failed to roll a valid value after many attempts.');
}



