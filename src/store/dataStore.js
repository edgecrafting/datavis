import { create } from 'zustand';

const MAX_CACHE_SIZE = 200;

// Data storage for loaded time series
// seriesMap = what's displayed on chart (rebuilt on each GO/F9)
// seriesCache = persistent in-memory cache of all loaded series in session
export const useDataStore = create((set, get) => ({
    // Display map — only what current expressions produce
    seriesMap: {},

    // Persistent session cache — survives across expression evaluations
    seriesCache: {},
    cacheOrder: [],  // LRU tracking: most recently used at end

    // Loading state
    isLoading: false,
    error: null,

    // Display actions — rebuilt on each evaluation
    setSeriesMap: (map) => set({ seriesMap: map }),

    addSeries: (ticker, data) => set((state) => ({
        seriesMap: { ...state.seriesMap, [ticker]: data }
    })),

    removeSeries: (ticker) => set((state) => {
        const newMap = { ...state.seriesMap };
        delete newMap[ticker];
        return { seriesMap: newMap };
    }),

    clearAll: () => set({ seriesMap: {} }),

    // Cache actions — persistent for session, with LRU eviction
    addToCache: (ticker, data) => set((state) => {
        const newCache = { ...state.seriesCache, [ticker]: data };
        let newOrder = state.cacheOrder.filter(k => k !== ticker);
        newOrder.push(ticker);

        // Evict oldest entries if over limit
        while (newOrder.length > MAX_CACHE_SIZE) {
            const evicted = newOrder.shift();
            delete newCache[evicted];
        }

        return { seriesCache: newCache, cacheOrder: newOrder };
    }),

    getFromCache: (ticker) => {
        const state = get();
        const cache = state.seriesCache;
        let key = null;
        if (cache[ticker]) {
            key = ticker;
        } else {
            key = Object.keys(cache).find(k => k.toLowerCase() === ticker.toLowerCase());
        }
        if (key) {
            // LRU promotion
            const newOrder = state.cacheOrder.filter(k => k !== key);
            newOrder.push(key);
            // Can't call set() inside get() synchronously, so schedule it
            queueMicrotask(() => {
                useDataStore.setState({ cacheOrder: newOrder });
            });
            return cache[key];
        }
        return null;
    },

    clearCache: () => set({ seriesCache: {}, cacheOrder: [] }),

    setLoading: (loading) => set({ isLoading: loading }),
    setError: (err) => set({ error: err }),
}));
