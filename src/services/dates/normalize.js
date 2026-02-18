// Centralized date parsing and normalization

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/**
 * Parse various date formats into a Date object.
 * Supports: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, dMMMYY (e.g., 15Oct15)
 */
export function parseDate(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim();

    // Try ISO: YYYY-MM-DD
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d;

    // Try DD/MM/YYYY
    const parts = s.split('/');
    if (parts.length === 3) {
        d = new Date(parts[2], parts[1] - 1, parts[0]);
        if (!isNaN(d.getTime())) return d;
    }

    // Try dMMMYY (e.g., 15Oct15)
    const match = s.match(/^(\d{1,2})([A-Za-z]{3})(\d{2,4})$/);
    if (match) {
        const mon = MONTHS[match[2].toLowerCase()];
        if (mon !== undefined) {
            let yr = parseInt(match[3]);
            if (yr < 100) yr += yr > 50 ? 1900 : 2000;
            d = new Date(yr, mon, parseInt(match[1]));
            if (!isNaN(d.getTime())) return d;
        }
    }

    return null;
}

/**
 * Normalize any date string to YYYY-MM-DD format for consistent comparison.
 * Returns original string if parsing fails.
 */
export function normalizeDate(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
