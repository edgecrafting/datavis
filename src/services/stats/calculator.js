// Statistics Calculator
// AR: Annualized Return = (end/start)^(252/days) - 1
// Vol: Volatility = std(daily_returns) * sqrt(252)
// Sharpe: AR / Vol (rf=0)
// MaxDD: Maximum Drawdown
// MinR1: Minimum 1-day return
// MaxR1: Maximum 1-day return

import { parseDate } from '../dates/normalize.js';

export const calculateStats = (dates, values) => {
    if (!values || values.length < 2) {
        return { ar: 0, vol: 0, sharpe: 0, maxDD: 0, minR1: 0, maxR1: 0 };
    }

    // Filter nulls
    const cleanPairs = [];
    for (let i = 0; i < values.length; i++) {
        if (values[i] !== null && !isNaN(values[i])) {
            cleanPairs.push({ date: dates[i], value: values[i] });
        }
    }
    if (cleanPairs.length < 2) return { ar: 0, vol: 0, sharpe: 0, maxDD: 0, minR1: 0, maxR1: 0 };

    const cleanValues = cleanPairs.map(p => p.value);
    const startVal = cleanValues[0];
    const endVal = cleanValues[cleanValues.length - 1];

    // Try to compute actual year fraction from dates
    let years;
    const firstDate = parseDate(cleanPairs[0].date);
    const lastDate = parseDate(cleanPairs[cleanPairs.length - 1].date);
    if (firstDate && lastDate && lastDate > firstDate) {
        const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
        years = (lastDate - firstDate) / msPerYear;
    } else {
        years = cleanValues.length / 252;
    }

    // AR
    let ar = 0;
    if (startVal > 0 && endVal > 0 && years > 0) {
        ar = Math.pow(endVal / startVal, 1 / years) - 1;
    } else if (startVal !== 0 && years > 0) {
        // Arithmetic annualized change for series that can be negative (spreads, rates)
        ar = (endVal - startVal) / Math.abs(startVal) / years;
    }

    // Daily returns
    const returns = [];
    for (let i = 1; i < cleanValues.length; i++) {
        if (cleanValues[i - 1] !== 0) {
            returns.push((cleanValues[i] - cleanValues[i - 1]) / cleanValues[i - 1]);
        } else {
            returns.push(0);
        }
    }

    // Vol (Bessel's correction: N-1 for sample variance by default)
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    let useSample = true;
    try {
        const v = localStorage.getItem('useSampleVariance');
        if (v !== null) useSample = JSON.parse(v);
    } catch { /* default to sample */ }
    const divisor = useSample && returns.length > 1 ? returns.length - 1 : returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / divisor;
    const vol = Math.sqrt(variance) * Math.sqrt(252);

    // Sharpe
    const sharpe = vol === 0 ? 0 : ar / vol;

    // MaxDD
    let maxDD = 0;
    let peak = cleanValues[0];
    for (const v of cleanValues) {
        if (v > peak) peak = v;
        const dd = (peak - v) / peak;
        if (dd > maxDD) maxDD = dd;
    }

    // MinR1 and MaxR1 (loop instead of spread to avoid stack overflow on large arrays)
    let minR1 = 0;
    let maxR1 = 0;
    if (returns.length > 0) {
        minR1 = returns[0];
        maxR1 = returns[0];
        for (let i = 1; i < returns.length; i++) {
            if (returns[i] < minR1) minR1 = returns[i];
            if (returns[i] > maxR1) maxR1 = returns[i];
        }
    }

    return {
        ar,
        vol,
        sharpe,
        maxDD: -maxDD,
        minR1,
        maxR1,
    };
};

