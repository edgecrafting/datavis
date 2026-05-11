import { describe, it, expect } from 'vitest';
import { dateAlign, dateAlignMultiple } from '../src/services/expression/dateAlign.js';

const s = (name, dates, values) => ({ name, dates, values });

describe('dateAlign', () => {
    it('intersects two series', () => {
        const a = s('a', ['2024-01-01', '2024-01-02', '2024-01-03'], [1, 2, 3]);
        const b = s('b', ['2024-01-02', '2024-01-03', '2024-01-04'], [20, 30, 40]);
        const out = dateAlign(a, b);
        expect(out.dates).toEqual(['2024-01-02', '2024-01-03']);
        expect(out.leftValues).toEqual([2, 3]);
        expect(out.rightValues).toEqual([20, 30]);
    });

    it('returns empty for non-overlapping series', () => {
        const a = s('a', ['2024-01-01'], [1]);
        const b = s('b', ['2025-01-01'], [2]);
        const out = dateAlign(a, b);
        expect(out.dates).toEqual([]);
    });

    it('preserves left-series order', () => {
        const a = s('a', ['2024-01-03', '2024-01-01', '2024-01-02'], [3, 1, 2]);
        const b = s('b', ['2024-01-01', '2024-01-02', '2024-01-03'], [10, 20, 30]);
        const out = dateAlign(a, b);
        expect(out.dates).toEqual(['2024-01-03', '2024-01-01', '2024-01-02']);
    });
});

describe('dateAlignMultiple', () => {
    it('takes union of dates and pads missing with null', () => {
        const a = s('a', ['2024-01-01', '2024-01-02'], [1, 2]);
        const b = s('b', ['2024-01-02', '2024-01-03'], [20, 30]);
        const out = dateAlignMultiple([a, b]);
        expect(out.dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
        expect(out.columns.a).toEqual([1, 2, null]);
        expect(out.columns.b).toEqual([null, 20, 30]);
    });

    it('handles single series', () => {
        const a = s('a', ['2024-01-01', '2024-01-02'], [1, 2]);
        const out = dateAlignMultiple([a]);
        expect(out.dates).toEqual(['2024-01-01', '2024-01-02']);
        expect(out.columns.a).toEqual([1, 2]);
    });

    it('sorts result chronologically', () => {
        const a = s('a', ['2024-03-01', '2024-01-01'], [3, 1]);
        const b = s('b', ['2024-02-01'], [2]);
        const out = dateAlignMultiple([a, b]);
        expect(out.dates).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);
    });
});
