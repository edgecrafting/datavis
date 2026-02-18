import { registerFunction, registry } from './registry';
import { withStats } from '../stats/withStats.js';
import { useAppStore } from '../../store/appStore.js';
import { parseDateInput, normalizeDate } from '../dates/normalize.js';

// Core Financial Functions

// Helper: find the rebase value — uses the app's applied Start date if set
function findRebaseValue(series) {
    const startDateStr = useAppStore.getState().appliedStartDate;
    if (startDateStr) {
        // Resolve relative dates like "-5y", "ytd", "10jan20" to YYYY-MM-DD
        const parsed = parseDateInput(startDateStr);
        if (parsed) {
            const target = normalizeDate(parsed.toISOString().slice(0, 10));
            for (let i = 0; i < series.dates.length; i++) {
                if (series.dates[i] >= target && series.values[i] !== null && !isNaN(series.values[i])) {
                    return series.values[i];
                }
            }
        }
    }
    // Fallback: first non-null value
    return series.values.find(v => v !== null && !isNaN(v));
}

// Ind: Rebase to 1.0 from the applied Start date (or first value if no Start set)
registerFunction('ind', (series) => {
    if (!series || series.values.length === 0) return series;
    const startVal = findRebaseValue(series);
    if (!startVal || startVal === 0) return series;

    return withStats({
        ...series,
        name: `ind(${series.name})`,
        values: series.values.map(v => v !== null ? v / startVal : null)
    });
}, "Rebase to 1.0 from Start date (set in toolbar)");

// Indd: Rebase to 0 from the applied Start date (or first value if no Start set)
registerFunction('indd', (series) => {
    if (!series || series.values.length === 0) return series;
    const startVal = findRebaseValue(series);
    if (startVal === null || startVal === undefined || isNaN(startVal)) return series;

    return withStats({
        ...series,
        name: `indd(${series.name})`,
        values: series.values.map(v => v !== null ? v - startVal : null)
    });
}, "Rebase to 0 from Start date (set in toolbar)");

// Moving Average
registerFunction('ma', (series, period = 20) => {
    if (!series) return null;
    period = Math.round(period);
    const values = series.values;
    const result = [];

    for (let i = 0; i < values.length; i++) {
        if (i < period - 1) {
            result.push(null);
            continue;
        }
        let sum = 0;
        let count = 0;
        for (let j = 0; j < period; j++) {
            if (values[i - j] !== null) {
                sum += values[i - j];
                count++;
            }
        }
        result.push(count > 0 ? sum / count : null);
    }

    return withStats({
        ...series,
        name: `ma(${series.name}, ${period})`,
        values: result
    });
}, "Simple Moving Average");

// Diff: First difference
registerFunction('diff', (series) => {
    if (!series) return null;
    const values = series.values;
    const result = [null];

    for (let i = 1; i < values.length; i++) {
        if (values[i] !== null && values[i - 1] !== null) {
            result.push(values[i] - values[i - 1]);
        } else {
            result.push(null);
        }
    }

    return withStats({
        ...series,
        name: `diff(${series.name})`,
        values: result
    });
}, "First difference");

// Shift: Lag (positive N) or Lead (negative N)
registerFunction('shift', (series, n = 1) => {
    if (!series) return null;
    n = Math.round(n);
    const values = series.values;
    const result = new Array(values.length).fill(null);

    if (n >= 0) {
        for (let i = n; i < values.length; i++) {
            result[i] = values[i - n];
        }
    } else {
        const absN = -n;
        for (let i = 0; i < values.length - absN; i++) {
            result[i] = values[i + absN];
        }
    }

    return withStats({
        ...series,
        name: `shift(${series.name}, ${n})`,
        values: result
    });
}, "Lag/shift series by N periods (negative = lead)");

// Basic Math
registerFunction('sqrt', (series) => {
    if (!series) return null;
    return withStats({
        ...series,
        name: `sqrt(${series.name})`,
        values: series.values.map(v => v !== null && v >= 0 ? Math.sqrt(v) : null)
    });
}, "Square root");

registerFunction('log', (series) => {
    if (!series) return null;
    return withStats({
        ...series,
        name: `log(${series.name})`,
        values: series.values.map(v => v !== null && v > 0 ? Math.log(v) : null)
    });
}, "Natural logarithm");

registerFunction('abs', (series) => {
    if (!series) return null;
    return withStats({
        ...series,
        name: `abs(${series.name})`,
        values: series.values.map(v => v !== null ? Math.abs(v) : null)
    });
}, "Absolute value");

// btob: Load series from a local file path
registerFunction('btob', (pathArg, format) => {
    // btob is synchronous in the function registry but file loading is async.
    // This needs to be pre-resolved before the expression evaluator runs.
    // For now, we throw a descriptive error; the actual btob loading happens
    // through the expression panel's special handling.
    if (typeof pathArg === 'string') {
        throw new Error(`btob("${pathArg}"): Use the tree browser to load files. btob paths are resolved relative to your data root.`);
    }
    throw new Error('btob requires a path string argument');
}, "Load series from local file path");

// Cumulative sum
registerFunction('cumsum', (series) => {
    if (!series) return null;
    const values = series.values;
    const result = [];
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        if (values[i] !== null) {
            sum += values[i];
            result.push(sum);
        } else {
            result.push(null);
        }
    }
    return withStats({
        ...series,
        name: `cumsum(${series.name})`,
        values: result
    });
}, "Cumulative sum");

// Min / Max over rolling window
registerFunction('rmin', (series, period = 20) => {
    if (!series) return null;
    period = Math.round(period);
    const values = series.values;
    const result = [];
    for (let i = 0; i < values.length; i++) {
        if (i < period - 1) { result.push(null); continue; }
        let min = Infinity;
        for (let j = 0; j < period; j++) {
            if (values[i - j] !== null && values[i - j] < min) min = values[i - j];
        }
        result.push(min === Infinity ? null : min);
    }
    return withStats({ ...series, name: `rmin(${series.name}, ${period})`, values: result });
}, "Rolling minimum");

registerFunction('rmax', (series, period = 20) => {
    if (!series) return null;
    period = Math.round(period);
    const values = series.values;
    const result = [];
    for (let i = 0; i < values.length; i++) {
        if (i < period - 1) { result.push(null); continue; }
        let max = -Infinity;
        for (let j = 0; j < period; j++) {
            if (values[i - j] !== null && values[i - j] > max) max = values[i - j];
        }
        result.push(max === -Infinity ? null : max);
    }
    return withStats({ ...series, name: `rmax(${series.name}, ${period})`, values: result });
}, "Rolling maximum");

// Pct change
registerFunction('pct', (series) => {
    if (!series) return null;
    const values = series.values;
    const result = [null];
    for (let i = 1; i < values.length; i++) {
        if (values[i] !== null && values[i - 1] !== null && values[i - 1] !== 0) {
            result.push((values[i] - values[i - 1]) / values[i - 1]);
        } else {
            result.push(null);
        }
    }
    return withStats({ ...series, name: `pct(${series.name})`, values: result });
}, "Percentage change (daily return)");

// Standard deviation (rolling)
registerFunction('rstd', (series, period = 20) => {
    if (!series) return null;
    period = Math.round(period);
    const values = series.values;
    const result = [];
    for (let i = 0; i < values.length; i++) {
        if (i < period - 1) { result.push(null); continue; }
        const window = [];
        for (let j = 0; j < period; j++) {
            if (values[i - j] !== null) window.push(values[i - j]);
        }
        if (window.length < 2) { result.push(null); continue; }
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        let useSample = true;
        try {
            const v = localStorage.getItem('useSampleVariance');
            if (v !== null) useSample = JSON.parse(v);
        } catch { /* default to sample */ }
        const divisor = useSample && window.length > 1 ? window.length - 1 : window.length;
        const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / divisor;
        result.push(Math.sqrt(variance));
    }
    return withStats({ ...series, name: `rstd(${series.name}, ${period})`, values: result });
}, "Rolling standard deviation");

// Exponential Moving Average
registerFunction('ema', (series, span = 20) => {
    if (!series) return null;
    span = Math.round(span);
    const values = series.values;
    const result = [];
    const alpha = 2 / (span + 1);
    let ema = null;
    for (let i = 0; i < values.length; i++) {
        if (values[i] === null) {
            result.push(ema);
            continue;
        }
        if (ema === null) {
            ema = values[i];
        } else {
            ema = alpha * values[i] + (1 - alpha) * ema;
        }
        result.push(ema);
    }
    return withStats({ ...series, name: `ema(${series.name}, ${span})`, values: result });
}, "Exponential Moving Average");

// Z-Score (rolling)
registerFunction('zscore', (series, period = 20) => {
    if (!series) return null;
    period = Math.round(period);
    const values = series.values;
    const result = [];
    for (let i = 0; i < values.length; i++) {
        if (i < period - 1) { result.push(null); continue; }
        const window = [];
        for (let j = 0; j < period; j++) {
            if (values[i - j] !== null) window.push(values[i - j]);
        }
        if (window.length < 2) { result.push(null); continue; }
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        const std = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / (window.length - 1));
        result.push(std > 0 ? (values[i] - mean) / std : 0);
    }
    return withStats({ ...series, name: `zscore(${series.name}, ${period})`, values: result });
}, "Rolling Z-Score");

// Correlation (rolling) between two series
registerFunction('corr', (seriesA, seriesB, period = 60) => {
    if (!seriesA || !seriesB) return null;
    period = Math.round(period);
    const len = Math.min(seriesA.values.length, seriesB.values.length);
    const result = [];
    for (let i = 0; i < len; i++) {
        if (i < period - 1) { result.push(null); continue; }
        let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0, n = 0;
        for (let j = 0; j < period; j++) {
            const a = seriesA.values[i - j];
            const b = seriesB.values[i - j];
            if (a !== null && b !== null) {
                sumA += a; sumB += b; sumAB += a * b; sumA2 += a * a; sumB2 += b * b; n++;
            }
        }
        if (n < 2) { result.push(null); continue; }
        const denom = Math.sqrt((n * sumA2 - sumA ** 2) * (n * sumB2 - sumB ** 2));
        result.push(denom > 0 ? (n * sumAB - sumA * sumB) / denom : 0);
    }
    return withStats({
        name: `corr(${seriesA.name}, ${seriesB.name}, ${period})`,
        dates: seriesA.dates.slice(0, len),
        values: result,
    });
}, "Rolling correlation between two series");

// Beta (rolling) of series vs benchmark
registerFunction('beta', (series, benchmark, period = 60) => {
    if (!series || !benchmark) return null;
    period = Math.round(period);
    const len = Math.min(series.values.length, benchmark.values.length);
    const retS = [null], retB = [null];
    for (let i = 1; i < len; i++) {
        const s0 = series.values[i - 1], s1 = series.values[i];
        const b0 = benchmark.values[i - 1], b1 = benchmark.values[i];
        retS.push(s0 && s0 !== 0 ? (s1 - s0) / s0 : null);
        retB.push(b0 && b0 !== 0 ? (b1 - b0) / b0 : null);
    }
    const result = [];
    for (let i = 0; i < len; i++) {
        if (i < period) { result.push(null); continue; }
        let sumXY = 0, sumX2 = 0, meanX = 0, meanY = 0, n = 0;
        for (let j = 0; j < period; j++) {
            if (retS[i - j] !== null && retB[i - j] !== null) {
                meanX += retB[i - j]; meanY += retS[i - j]; n++;
            }
        }
        if (n < 2) { result.push(null); continue; }
        meanX /= n; meanY /= n;
        for (let j = 0; j < period; j++) {
            if (retS[i - j] !== null && retB[i - j] !== null) {
                sumXY += (retB[i - j] - meanX) * (retS[i - j] - meanY);
                sumX2 += (retB[i - j] - meanX) ** 2;
            }
        }
        result.push(sumX2 > 0 ? sumXY / sumX2 : 0);
    }
    return withStats({
        name: `beta(${series.name}, ${benchmark.name}, ${period})`,
        dates: series.dates.slice(0, len),
        values: result,
    });
}, "Rolling beta vs benchmark");

// Drawdown series (peak-to-trough as fraction)
registerFunction('drawdown', (series) => {
    if (!series) return null;
    const values = series.values;
    const result = [];
    let peak = -Infinity;
    for (let i = 0; i < values.length; i++) {
        if (values[i] === null) { result.push(null); continue; }
        if (values[i] > peak) peak = values[i];
        result.push(peak > 0 ? (values[i] - peak) / peak : 0);
    }
    return withStats({ ...series, name: `drawdown(${series.name})`, values: result });
}, "Drawdown from peak (as fraction)");

// Rolling volatility (annualized)
registerFunction('vol', (series, period = 20) => {
    if (!series) return null;
    period = Math.round(period);
    const values = series.values;
    const returns = [null];
    for (let i = 1; i < values.length; i++) {
        if (values[i] !== null && values[i - 1] !== null && values[i - 1] !== 0) {
            returns.push((values[i] - values[i - 1]) / values[i - 1]);
        } else {
            returns.push(null);
        }
    }
    const result = [];
    for (let i = 0; i < returns.length; i++) {
        if (i < period) { result.push(null); continue; }
        const window = [];
        for (let j = 0; j < period; j++) {
            if (returns[i - j] !== null) window.push(returns[i - j]);
        }
        if (window.length < 2) { result.push(null); continue; }
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        const std = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / (window.length - 1));
        result.push(std * Math.sqrt(252));
    }
    return withStats({ ...series, name: `vol(${series.name}, ${period})`, values: result });
}, "Rolling annualized volatility");

// Year-over-Year change
registerFunction('yoy', (series) => {
    if (!series) return null;
    const values = series.values;
    const result = [];
    const lookback = 252; // ~1 year of trading days
    for (let i = 0; i < values.length; i++) {
        if (i < lookback || values[i] === null || values[i - lookback] === null || values[i - lookback] === 0) {
            result.push(null);
        } else {
            result.push((values[i] - values[i - lookback]) / values[i - lookback]);
        }
    }
    return withStats({ ...series, name: `yoy(${series.name})`, values: result });
}, "Year-over-year change (252 trading days)");
