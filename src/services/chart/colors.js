// Deterministic color palettes for chart series

const DEFAULT_COLORS = [
    '#0000FF',  // Blue
    '#FF0000',  // Red
    '#008000',  // Green
    '#FF8C00',  // Dark Orange
    '#800080',  // Purple
    '#008B8B',  // Dark Cyan
    '#A0522D',  // Sienna
    '#4B0082',  // Indigo
    '#DC143C',  // Crimson
    '#006400',  // Dark Green
    '#FF1493',  // Deep Pink
    '#1E90FF',  // Dodger Blue
    '#FFD700',  // Gold
    '#8B0000',  // Dark Red
    '#00CED1',  // Dark Turquoise
    '#9400D3',  // Dark Violet
];

// Okabe-Ito colorblind-friendly palette
const COLORBLIND_COLORS = [
    '#0072B2',  // Blue
    '#D55E00',  // Vermillion
    '#009E73',  // Bluish Green
    '#E69F00',  // Orange
    '#CC79A7',  // Reddish Purple
    '#56B4E9',  // Sky Blue
    '#F0E442',  // Yellow
    '#000000',  // Black
    '#0072B2',  // Blue (repeat with variation)
    '#D55E00',
    '#009E73',
    '#E69F00',
    '#CC79A7',
    '#56B4E9',
    '#F0E442',
    '#666666',  // Grey
];

function getActiveColors() {
    try {
        const pref = localStorage.getItem('colorblindPalette');
        if (pref === 'true') return COLORBLIND_COLORS;
    } catch { /* ignore */ }
    return DEFAULT_COLORS;
}

export function getSeriesColor(index) {
    const colors = getActiveColors();
    return colors[index % colors.length];
}

export function getAllColors() {
    return [...getActiveColors()];
}

export const COLORS = DEFAULT_COLORS;
export const COLORBLIND = COLORBLIND_COLORS;
