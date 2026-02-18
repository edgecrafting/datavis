// Date alignment for binary operations on series with different date ranges

/**
 * Aligns two series by date intersection.
 * Returns { dates, leftValues, rightValues } containing only dates present in both series.
 */
export function dateAlign(leftSeries, rightSeries) {
    // Build date->value maps
    const leftMap = new Map();
    for (let i = 0; i < leftSeries.dates.length; i++) {
        leftMap.set(leftSeries.dates[i], leftSeries.values[i]);
    }

    const rightMap = new Map();
    for (let i = 0; i < rightSeries.dates.length; i++) {
        rightMap.set(rightSeries.dates[i], rightSeries.values[i]);
    }

    // Compute intersection — use the left series dates as reference order
    const dates = [];
    const leftValues = [];
    const rightValues = [];

    for (const date of leftSeries.dates) {
        if (rightMap.has(date)) {
            dates.push(date);
            leftValues.push(leftMap.get(date));
            rightValues.push(rightMap.get(date));
        }
    }

    return { dates, leftValues, rightValues };
}

/**
 * Merges multiple series into a single table aligned by date union.
 * Returns { dates, columns: { name: values[] } } with null for missing values.
 */
export function dateAlignMultiple(seriesList) {
    // Collect all unique dates
    const dateSet = new Set();
    for (const series of seriesList) {
        for (const d of series.dates) {
            dateSet.add(d);
        }
    }

    // Sort dates chronologically
    const dates = [...dateSet].sort((a, b) => {
        const da = new Date(a);
        const db = new Date(b);
        return da - db;
    });

    // Build date->index map for each series
    const columns = {};
    for (const series of seriesList) {
        const valMap = new Map();
        for (let i = 0; i < series.dates.length; i++) {
            valMap.set(series.dates[i], series.values[i]);
        }
        columns[series.name] = dates.map(d => valMap.get(d) ?? null);
    }

    return { dates, columns };
}
