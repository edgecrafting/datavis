// Track usage counts for series names referenced in expressions.
// Keyed by case-insensitive name; preserves the most recent display casing.

const STORAGE_KEY = 'datavisUsageCounts';

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
        return {};
    }
}

function save(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* quota or disabled */ }
}

export function recordUsage(name) {
    if (!name || typeof name !== 'string') return;
    const data = load();
    const key = name.toLowerCase();
    const entry = data[key] || { name, count: 0, lastUsed: 0 };
    entry.name = name; // refresh to latest casing
    entry.count++;
    entry.lastUsed = Date.now();
    data[key] = entry;
    save(data);
}

export function getTopSymbols(limit = 20) {
    const data = load();
    return Object.values(data)
        .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
        .slice(0, limit);
}

export function clearUsage() {
    save({});
}
