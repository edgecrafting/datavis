import { describe, it, expect } from 'vitest';
import { parseDate, normalizeDate } from '../src/services/dates/normalize.js';

describe('parseDate', () => {
    it('parses ISO format', () => {
        const d = parseDate('2024-01-15');
        expect(d).toBeInstanceOf(Date);
        expect(d.getFullYear()).toBe(2024);
    });

    it('parses DD/MM/YYYY format', () => {
        const d = parseDate('15/01/2024');
        expect(d).toBeInstanceOf(Date);
        expect(d.getDate()).toBe(15);
    });

    it('parses dMMMYY format', () => {
        const d = parseDate('15Oct15');
        expect(d).toBeInstanceOf(Date);
        expect(d.getMonth()).toBe(9); // October = 9
        expect(d.getFullYear()).toBe(2015);
    });

    it('returns null for invalid dates', () => {
        expect(parseDate('')).toBeNull();
        expect(parseDate(null)).toBeNull();
        expect(parseDate('not-a-date')).toBeNull();
    });

    it('returns null for non-date strings like "Notes:"', () => {
        expect(parseDate('Notes:')).toBeNull();
    });
});

describe('normalizeDate', () => {
    it('normalizes ISO to YYYY-MM-DD', () => {
        expect(normalizeDate('2024-01-15')).toBe('2024-01-15');
    });

    it('normalizes dMMMYY to YYYY-MM-DD', () => {
        expect(normalizeDate('15Oct15')).toBe('2015-10-15');
    });

    it('returns original string for unparseable input', () => {
        expect(normalizeDate('garbage')).toBe('garbage');
    });
});
