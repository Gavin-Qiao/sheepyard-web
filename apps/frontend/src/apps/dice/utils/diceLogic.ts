// Dice Logic Utilities

export interface DiceConfig {
    n0: number; // Start of range
    n1: number; // End of range
    includeStart: boolean;
    includeEnd: boolean;
}

export interface DiceMathResult {
    N: number;      // Total outcomes
    k: number;      // Number of d20s needed
    Limit: number;  // Rejection threshold
    rangeMin: number; // The effective minimum value (n0 or n0+1)
}

/**
 * Calculates the mathematical parameters needed for the roll.
 */
export function calculateDiceParams(
    n0: number,
    n1: number,
    includeStart: boolean,
    includeEnd: boolean
): DiceMathResult {
    // 1. Determine effective range [min, max] (inclusive)
    const min = includeStart ? n0 : n0 + 1;
    const max = includeEnd ? n1 : n1 - 1;

    // Validate range
    if (min > max) {
        // Fallback for invalid range
        return { N: 1, k: 1, Limit: 20, rangeMin: min };
    }

    const N = max - min + 1;
    const rangeMin = min;

    // 2. Determine k (number of d20s)
    // We need 20^k >= N
    let k = 1;
    let space = 20;
    while (space < N) {
        k++;
        space *= 20;
    }

    // 3. Calculate Limit
    // Limit is the largest multiple of N that fits in space S = 20^k
    // Limit = floor(S / N) * N
    // If RawValue >= Limit, we reroll.
    const S = Math.pow(20, k);
    const Limit = Math.floor(S / N) * N;

    return { N, k, Limit, rangeMin };
}

/**
 * Converts an array of d20 roll results (1-20) into a single raw value R.
 * The dice are treated as base-20 digits (0-19).
 * R = sum((d_i - 1) * 20^(power))
 */
export function calculateRawValue(diceValues: number[]): number {
    // We assume diceValues[0] is the most significant digit, or least?
    // User example: "(d1-1)*6 + (d2-1)".
    // This implies d1 is the higher order digit (times 6).
    // So we will treat the first die as the most significant.

    let R = 0;
    const k = diceValues.length;

    for (let i = 0; i < k; i++) {
        const digit = diceValues[i] - 1; // Convert 1-20 to 0-19
        const power = k - 1 - i;
        R += digit * Math.pow(20, power);
    }

    return R;
}

/**
 * Checks if the raw value is valid for the given Limit.
 */
export function isValidRoll(R: number, Limit: number): boolean {
    return R < Limit;
}

/**
 * Calculates the final result from a valid raw value R.
 */
export function calculateFinalResult(R: number, N: number, rangeMin: number): number {
    const offset = R % N;
    return rangeMin + offset;
}
