import { describe, it, expect, beforeAll } from 'vitest';
import { registry } from '../src/services/functions/registry.js';
import '../src/services/functions/core.js';

// Mock localStorage
globalThis.localStorage = {
    store: {},
    getItem(key) { return this.store[key] ?? null; },
    setItem(key, value) { this.store[key] = String(value); },
    removeItem(key) { delete this.store[key]; },
    clear() { this.store = {}; },
};

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

    it('registerFunction preserves descriptions', () => {
        const entry = registry.functions['ind'];
        expect(entry.description).toBe('Rebase series to start at 1.0');
    });
});
