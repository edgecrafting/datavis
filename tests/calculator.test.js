import { describe, it, expect, beforeEach } from 'vitest';
import { calculateStats } from '../src/services/stats/calculator.js';

// Mock localStorage for Bessel's correction toggle
const localStorageMock = {
    store: {},
    getItem(key) { return this.store[key] ?? null; },
    setItem(key, value) { this.store[key] = String(value); },
    removeItem(key) { delete this.store[key]; },
    clear() { this.store = {}; },
};
globalThis.localStorage = localStorageMock;

describe('calculateStats', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('returns zeroes for empty input', () => {
        const stats = calculateStats([], []);
        expect(stats.ar).toBe(0);
        expect(stats.vol).toBe(0);
        expect(stats.sharpe).toBe(0);
        expect(stats.maxDD).toBe(0);
    });

    it('returns zeroes for single value', () => {
        const stats = calculateStats(['2024-01-01'], [100]);
        expect(stats.ar).toBe(0);
    });

    it('computes positive annualized return', () => {
        const dates = ['2023-01-01', '2024-01-01'];
        const values = [100, 110];
        const stats = calculateStats(dates, values);
        expect(stats.ar).toBeGreaterThan(0);
        expect(stats.ar).toBeCloseTo(0.1, 1);
    });

    it('filters out null and NaN values', () => {
        const dates = ['2023-01-01', '2023-06-01', '2024-01-01'];
        const values = [100, null, 110];
        const stats = calculateStats(dates, values);
        expect(stats.ar).toBeGreaterThan(0);
    });

    it('handles large arrays without stack overflow (MinR1/MaxR1)', () => {
        const n = 200000;
        const dates = Array.from({ length: n }, (_, i) => {
            const d = new Date(2000, 0, 1);
            d.setDate(d.getDate() + i);
            return d.toISOString().slice(0, 10);
        });
        const values = Array.from({ length: n }, (_, i) => 100 + Math.sin(i / 100));
        // Should not throw
        const stats = calculateStats(dates, values);
        expect(typeof stats.minR1).toBe('number');
        expect(typeof stats.maxR1).toBe('number');
    });

    it('uses sample variance (N-1) by default', () => {
        // With N-1, vol should be slightly higher than population variance
        const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
        const values = [100, 102, 101];
        localStorageMock.setItem('useSampleVariance', 'true');
        const statsSample = calculateStats(dates, values);

        localStorageMock.setItem('useSampleVariance', 'false');
        const statsPop = calculateStats(dates, values);

        expect(statsSample.vol).toBeGreaterThan(statsPop.vol);
    });

    it('computes AR for negative-value series via arithmetic change', () => {
        const dates = ['2023-01-01', '2024-01-01'];
        const values = [-2, -1]; // Spread narrowing
        const stats = calculateStats(dates, values);
        expect(stats.ar).not.toBe(0);
    });

    it('maxDD is non-positive', () => {
        const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
        const values = [100, 90, 95];
        const stats = calculateStats(dates, values);
        expect(stats.maxDD).toBeLessThanOrEqual(0);
    });
});
