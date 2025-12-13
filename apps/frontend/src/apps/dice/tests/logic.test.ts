import { describe, it, expect } from 'vitest';
import { calculateDiceParams, calculateRawValue, isValidRoll, calculateFinalResult } from '../utils/diceLogic';

describe('Dice Logic', () => {
    describe('calculateDiceParams', () => {
        it('should calculate correct params for small range (1-6)', () => {
            const { N, k, Limit } = calculateDiceParams(1, 6, true, true);
            expect(N).toBe(6);
            expect(k).toBe(1);
            expect(Limit).toBe(18);
        });

        it('should calculate correct params for medium range (1-100)', () => {
            const { N, k, Limit } = calculateDiceParams(1, 100, true, true);
            expect(N).toBe(100);
            expect(k).toBe(2);
            expect(Limit).toBe(400);
        });

        it('should calculate correct params for uneven range (0-2)', () => {
            const { N, k, Limit } = calculateDiceParams(0, 2, true, true);
            expect(N).toBe(3);
            expect(k).toBe(1);
            expect(Limit).toBe(18);
        });

        it('should handle exclusion of bounds', () => {
            const res1 = calculateDiceParams(1, 10, false, true);
            expect(res1.N).toBe(9);
            expect(res1.rangeMin).toBe(2);

            const res2 = calculateDiceParams(1, 10, true, false);
            expect(res2.N).toBe(9);
            expect(res2.rangeMin).toBe(1);
        });
    });

    describe('calculateRawValue', () => {
        it('should calculate raw value for 1 die', () => {
            expect(calculateRawValue([1])).toBe(0);
            expect(calculateRawValue([20])).toBe(19);
        });

        it('should calculate raw value for 2 dice', () => {
            expect(calculateRawValue([1, 1])).toBe(0);
            expect(calculateRawValue([2, 5])).toBe(24);
            expect(calculateRawValue([20, 20])).toBe(399);
        });
    });

    describe('isValidRoll', () => {
        it('should validate correctly', () => {
            expect(isValidRoll(17, 18)).toBe(true);
            expect(isValidRoll(18, 18)).toBe(false);
            expect(isValidRoll(19, 18)).toBe(false);
        });
    });

    describe('calculateFinalResult', () => {
        it('should calculate modulo and offset correctly', () => {
            expect(calculateFinalResult(0, 6, 1)).toBe(1);
            expect(calculateFinalResult(5, 6, 1)).toBe(6);
            expect(calculateFinalResult(6, 6, 1)).toBe(1);

            expect(calculateFinalResult(0, 3, 10)).toBe(10);
            expect(calculateFinalResult(17, 3, 10)).toBe(12);
        });
    });
});
