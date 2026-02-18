// Favorites manager - persistent bookmarks for file paths and tickers

const STORAGE_KEY = 'plottoolFavorites';

function loadFavorites() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return [];
}

function saveFavorites(favorites) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function getFavorites() {
    return loadFavorites();
}

export function addFavorite(item) {
    const favorites = loadFavorites();
    // item: { name, path, type: 'file' | 'ticker' }
    if (!favorites.find(f => f.path === item.path)) {
        favorites.push(item);
        saveFavorites(favorites);
    }
    return favorites;
}

export function removeFavorite(path) {
    const favorites = loadFavorites().filter(f => f.path !== path);
    saveFavorites(favorites);
    return favorites;
}

export function reorderFavorites(newOrder) {
    saveFavorites(newOrder);
    return newOrder;
}
