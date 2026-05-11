// Mock localStorage before any imports (appStore reads it at module level)
globalThis.localStorage = {
    store: {},
    getItem(key) { return this.store[key] ?? null; },
    setItem(key, value) { this.store[key] = String(value); },
    removeItem(key) { delete this.store[key]; },
    clear() { this.store = {}; },
};

import { describe, it, expect } from 'vitest';
import { registry } from '../src/services/functions/registry.js';
import { useAppStore } from '../src/store/appStore.js';
import '../src/services/functions/core.js';

const makeSeries = (name, values, dates) => ({
    name,
    dates: dates || values.map((_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`),
    values,
});

describe('core functions', () => {
    it('ind rebases to 1.0', () => {
        const fn = registry.get('ind');
        const result = fn(makeSeries('test', [50, 100, 75]));
        expect(result.values[0]).toBeCloseTo(1.0);
        expect(result.values[1]).toBeCloseTo(2.0);
        expect(result.values[2]).toBeCloseTo(1.5);
    });

    it('indd rebases to 0', () => {
        const fn = registry.get('indd');
        const result = fn(makeSeries('test', [50, 100, 75]));
        expect(result.values[0]).toBeCloseTo(0);
        expect(result.values[1]).toBeCloseTo(50);
    });

    it('indd handles NaN startVal', () => {
        const fn = registry.get('indd');
        const result = fn(makeSeries('test', [NaN, 100, 75]));
        // Should return series unchanged when startVal is NaN
        expect(result.values[0]).toBeNaN();
    });

    it('ma computes moving average', () => {
        const fn = registry.get('ma');
        const result = fn(makeSeries('test', [10, 20, 30, 40, 50]), 3);
        expect(result.values[0]).toBeNull();
        expect(result.values[1]).toBeNull();
        expect(result.values[2]).toBeCloseTo(20);
        expect(result.values[3]).toBeCloseTo(30);
    });

    it('diff computes first difference', () => {
        const fn = registry.get('diff');
        const result = fn(makeSeries('test', [10, 15, 12]));
        expect(result.values[0]).toBeNull();
        expect(result.values[1]).toBe(5);
        expect(result.values[2]).toBe(-3);
    });

    it('shift with positive n lags', () => {
        const fn = registry.get('shift');
        const result = fn(makeSeries('test', [10, 20, 30, 40]), 2);
        expect(result.values[0]).toBeNull();
        expect(result.values[1]).toBeNull();
        expect(result.values[2]).toBe(10);
        expect(result.values[3]).toBe(20);
    });

    it('shift with negative n leads', () => {
        const fn = registry.get('shift');
        const result = fn(makeSeries('test', [10, 20, 30, 40]), -1);
        expect(result.values[0]).toBe(20);
        expect(result.values[1]).toBe(30);
        expect(result.values[2]).toBe(40);
        expect(result.values[3]).toBeNull();
    });

    it('pct computes percentage change', () => {
        const fn = registry.get('pct');
        const result = fn(makeSeries('test', [100, 110, 99]));
        expect(result.values[0]).toBeNull();
        expect(result.values[1]).toBeCloseTo(0.1);
        expect(result.values[2]).toBeCloseTo(-0.1, 1);
    });

    it('cumsum accumulates', () => {
        const fn = registry.get('cumsum');
        const result = fn(makeSeries('test', [1, 2, 3, 4]));
        expect(result.values).toEqual([1, 3, 6, 10]);
    });

    it('abs makes values positive', () => {
        const fn = registry.get('abs');
        const result = fn(makeSeries('test', [-5, 3, -1]));
        expect(result.values).toEqual([5, 3, 1]);
    });

    it('ind rebases from appliedStartDate when set', () => {
        const fn = registry.get('ind');
        // Set appliedStartDate to 2024-01-02
        useAppStore.setState({ appliedStartDate: '2024-01-02' });
        const result = fn(makeSeries('test', [50, 100, 75], ['2024-01-01', '2024-01-02', '2024-01-03']));
        expect(result.values[0]).toBeCloseTo(0.5);   // 50/100
        expect(result.values[1]).toBeCloseTo(1.0);   // 100/100
        expect(result.values[2]).toBeCloseTo(0.75);  // 75/100
        // Reset
        useAppStore.setState({ appliedStartDate: '' });
    });

    it('registerFunction preserves descriptions', () => {
        const entry = registry.functions['ind'];
        expect(entry.description).toContain('Rebase to 1.0');
    });

    it('if returns a where cond > 0 else b (element-wise)', () => {
        const fn = registry.get('if');
        const cond = makeSeries('c', [1, 0, 1, 0]);
        const a = makeSeries('a', [10, 20, 30, 40]);
        const b = makeSeries('b', [100, 200, 300, 400]);
        const result = fn(cond, a, b);
        expect(result.values).toEqual([10, 200, 30, 400]);
    });

    it('gt returns 1 where a > b else 0', () => {
        const fn = registry.get('gt');
        const a = makeSeries('a', [1, 5, 3, 7]);
        const b = makeSeries('b', [2, 4, 3, 8]);
        const result = fn(a, b);
        expect(result.values).toEqual([0, 1, 0, 0]);
    });

    it('percentile handles edge cases', () => {
        const fn = registry.get('percentile');
        const series = makeSeries('test', [1, 2, 3, 4, 5]);
        const result = fn(series, 0.5, 5);
        // Last value is median of [1,2,3,4,5] = 3
        expect(result.values[4]).toBeCloseTo(3);
    });

    it('skew of symmetric series is ~0', () => {
        const fn = registry.get('skew');
        // Symmetric around mean
        const series = makeSeries('test', Array.from({ length: 60 }, (_, i) => Math.sin(i / 5)));
        const result = fn(series, 60);
        expect(Math.abs(result.values[59])).toBeLessThan(0.5);
    });

    it('kurt of normal-ish series is finite', () => {
        const fn = registry.get('kurt');
        const series = makeSeries('test', Array.from({ length: 60 }, (_, i) => Math.sin(i / 7) + Math.cos(i / 11)));
        const result = fn(series, 60);
        expect(isFinite(result.values[59])).toBe(true);
    });

    it('monthly keeps the last value of each month', () => {
        const fn = registry.get('monthly');
        const dates = ['2024-01-05', '2024-01-15', '2024-01-31', '2024-02-10', '2024-02-28'];
        const values = [10, 20, 30, 40, 50];
        const result = fn({ name: 'test', dates, values });
        expect(result.dates).toEqual(['2024-01-31', '2024-02-28']);
        expect(result.values).toEqual([30, 50]);
    });

    it('yearly keeps the last value of each year', () => {
        const fn = registry.get('yearly');
        const dates = ['2022-01-01', '2022-12-31', '2023-06-15', '2024-01-01'];
        const values = [1, 2, 3, 4];
        const result = fn({ name: 'test', dates, values });
        expect(result.dates).toEqual(['2022-12-31', '2023-06-15', '2024-01-01']);
        expect(result.values).toEqual([2, 3, 4]);
    });

    it('weekly groups by ISO week', () => {
        const fn = registry.get('weekly');
        // Monday + Friday of same ISO week should collapse
        const dates = ['2024-01-01', '2024-01-05', '2024-01-08'];
        const values = [1, 2, 3];
        const result = fn({ name: 'test', dates, values });
        expect(result.values).toEqual([2, 3]);
    });
});
