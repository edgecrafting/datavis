import { create } from 'zustand';

// Safe localStorage access (supports test environments without DOM)
const ls = typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// Load recent files from localStorage
let savedRecentFiles = [];
try {
    const stored = ls.getItem('recentFiles');
    if (stored) savedRecentFiles = JSON.parse(stored);
} catch { /* ignore */ }

// Load tree categories from localStorage. Each category groups paths into
// a logical bucket displayed above the real filesystem in the tree.
let savedTreeCategories = [];
try {
    const stored = ls.getItem('treeCategories');
    if (stored) savedTreeCategories = JSON.parse(stored);
} catch { /* ignore */ }

export const useAppStore = create((set) => ({
    // Default path to BBGDB
    rootPath: ls.getItem('lastRootPath') || 'C:\\Users\\haibi\\Python\\BBGDB',
    currentPath: ls.getItem('lastRootPath') || 'C:\\Users\\haibi\\Python\\BBGDB',

    // Selection state
    selectedFile: null,
    selectedFiles: [],
    selectedSeriesKey: null,

    // UI State
    sidebarWidth: (() => {
        try {
            const v = ls.getItem('sidebarWidth');
            const n = v ? parseInt(v, 10) : NaN;
            return Number.isFinite(n) && n >= 150 && n <= 600 ? n : 220;
        } catch { return 220; }
    })(),
    isExpressionPanelOpen: true,

    // Toolbar/Panel visibility
    showMainToolbar: true,
    showExpressionTools: true,
    showPlotTools: true,
    showStudyBar: false,
    showExpressionWindow: true,
    showLineNumbers: (() => {
        try {
            const v = ls.getItem('showLineNumbers');
            return v === null ? true : JSON.parse(v);
        } catch { return true; }
    })(),

    // Chart state
    plotTitle: '',
    startDate: '',
    endDate: '',
    appliedStartDate: '',   // Only updated on F9/GO
    appliedEndDate: '',     // Only updated on F9/GO
    zoomStartDate: null,    // From Plotly zoom interaction
    zoomEndDate: null,      // From Plotly zoom interaction
    hoverDate: null,
    hoverValue: null,

    // Status
    statusMessage: 'For Help, press F1',

    // Recent files
    recentFiles: savedRecentFiles,

    // Currently-open workspace path (null if unsaved)
    currentWorkspacePath: null,

    // Locate / spotlight: when set, all other series render at low opacity.
    spotlightSeries: null,

    // Fixed chart size override (used by Format > Change Plot Size). Null = autosize.
    chartSize: null,  // { width, height } or null

    // Tree categories — logical groupings shown above the filesystem.
    // Shape: [{ name: string, items: [{ label: string, path: string }] }]
    treeCategories: savedTreeCategories,

    // Statistics preferences
    useSampleVariance: (() => {
        try {
            const v = ls.getItem('useSampleVariance');
            return v === null ? true : JSON.parse(v);
        } catch { return true; }
    })(),

    // Display preferences (read from plottoolOptions, written by OptionsDialog)
    decimals: (() => {
        try {
            const opts = JSON.parse(ls.getItem('plottoolOptions') || '{}');
            return Number.isFinite(opts.decimals) ? opts.decimals : 4;
        } catch { return 4; }
    })(),
    currencyCode: (() => {
        try {
            const opts = JSON.parse(ls.getItem('plottoolOptions') || '{}');
            return typeof opts.currencyCode === 'string' ? opts.currencyCode : '';
        } catch { return ''; }
    })(),

    // 2D: Consolidated dialog state — replaces 9 individual booleans
    activeDialog: null,  // 'colorPicker' | 'dataViewer' | 'vitalStats' | 'findReplace' | 'functionInsert' | 'favoritesManager' | 'studyPanel' | 'options' | 'about' | null
    dataViewerMerged: false,  // orthogonal flag for data viewer mode

    // Menu state
    activeMenuId: null,

    // Actions
    setRootPath: (path) => {
        ls.setItem('lastRootPath', path);
        set({ rootPath: path, currentPath: path });
    },
    setCurrentPath: (path) => set({ currentPath: path }),
    selectFile: (file) => set({ selectedFile: file }),
    toggleFileSelection: (file) => set((state) => {
        const exists = state.selectedFiles.find(f => f.path === file.path);
        if (exists) {
            return { selectedFiles: state.selectedFiles.filter(f => f.path !== file.path) };
        } else {
            return { selectedFiles: [...state.selectedFiles, file] };
        }
    }),
    setPlotTitle: (title) => set({ plotTitle: title }),
    setStartDate: (date) => set({ startDate: date }),
    setEndDate: (date) => set({ endDate: date }),
    setHover: (date, value) => set({ hoverDate: date, hoverValue: value }),
    clearHover: () => set({ hoverDate: null, hoverValue: null }),
    setStatusMessage: (msg) => set({ statusMessage: msg }),
    closeAllDialogs: () => set({ activeDialog: null }),

    // Tree category actions — persist to localStorage on each change.
    addTreeCategory: (name) => set((state) => {
        const next = [...state.treeCategories, { name, items: [] }];
        try { ls.setItem('treeCategories', JSON.stringify(next)); } catch { /* ignore */ }
        return { treeCategories: next };
    }),
    removeTreeCategory: (name) => set((state) => {
        const next = state.treeCategories.filter(c => c.name !== name);
        try { ls.setItem('treeCategories', JSON.stringify(next)); } catch { /* ignore */ }
        return { treeCategories: next };
    }),
    addItemToCategory: (categoryName, item) => set((state) => {
        const next = state.treeCategories.map(c =>
            c.name === categoryName
                ? { ...c, items: c.items.some(i => i.path === item.path) ? c.items : [...c.items, item] }
                : c
        );
        try { ls.setItem('treeCategories', JSON.stringify(next)); } catch { /* ignore */ }
        return { treeCategories: next };
    }),
    removeItemFromCategory: (categoryName, path) => set((state) => {
        const next = state.treeCategories.map(c =>
            c.name === categoryName ? { ...c, items: c.items.filter(i => i.path !== path) } : c
        );
        try { ls.setItem('treeCategories', JSON.stringify(next)); } catch { /* ignore */ }
        return { treeCategories: next };
    }),
}));
