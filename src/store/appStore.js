import { create } from 'zustand';

// Safe localStorage access (supports test environments without DOM)
const ls = typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// Load recent files from localStorage
let savedRecentFiles = [];
try {
    const stored = ls.getItem('recentFiles');
    if (stored) savedRecentFiles = JSON.parse(stored);
} catch (e) { /* ignore */ }

export const useAppStore = create((set) => ({
    // Default path to BBGDB
    rootPath: ls.getItem('lastRootPath') || 'C:\\Users\\haibi\\Python\\BBGDB',
    currentPath: ls.getItem('lastRootPath') || 'C:\\Users\\haibi\\Python\\BBGDB',

    // Selection state
    selectedFile: null,
    selectedFiles: [],
    selectedSeriesKey: null,

    // UI State
    sidebarWidth: 300,
    isExpressionPanelOpen: true,

    // Toolbar/Panel visibility
    showMainToolbar: true,
    showExpressionTools: true,
    showPlotTools: true,
    showStudyBar: false,
    showExpressionWindow: true,

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

    // Statistics preferences
    useSampleVariance: (() => {
        try {
            const v = ls.getItem('useSampleVariance');
            return v === null ? true : JSON.parse(v);
        } catch { return true; }
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
}));
