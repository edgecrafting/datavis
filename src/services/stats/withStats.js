import { calculateStats } from './calculator.js';

export function withStats(series) {
    if (!series) return null;
    return {
        ...series,
        stats: calculateStats(series.dates || [], series.values)
    };
}
