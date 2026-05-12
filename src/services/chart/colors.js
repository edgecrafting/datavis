// Deterministic color palettes for chart series

// Tableau 10 modern palette — softer, balanced hues optimized for data viz
// (good contrast on white, harmonious in combination, prints decently).
const DEFAULT_COLORS = [
    '#4E79A7',  // Steel Blue
    '#F28E2B',  // Orange
    '#E15759',  // Coral Red
    '#76B7B2',  // Teal
    '#59A14F',  // Green
    '#EDC948',  // Mustard
    '#B07AA1',  // Lavender
    '#FF9DA7',  // Pink
    '#9C755F',  // Brown
    '#BAB0AC',  // Warm Grey
    // Tableau 20 extension — slightly lighter complements
    '#86BCB6',  // Light Teal
    '#FABFD2',  // Pale Pink
    '#D37295',  // Rose
    '#A0CBE8',  // Light Blue
    '#F1CE63',  // Light Mustard
    '#B6992D',  // Dark Mustard
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
