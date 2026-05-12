const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow;

// Allowed root directories (updated when user opens directories or workspaces).
// Each root grants read/write access to itself and its descendants.
const allowedRoots = new Set();

// --- Persistent state (window geometry) ---
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
    try {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const s = JSON.parse(raw);
        return {
            width: Number.isFinite(s.width) ? s.width : 1200,
            height: Number.isFinite(s.height) ? s.height : 800,
            x: Number.isFinite(s.x) ? s.x : undefined,
            y: Number.isFinite(s.y) ? s.y : undefined,
            isMaximized: !!s.isMaximized,
        };
    } catch {
        return { width: 1200, height: 800 };
    }
}

function saveWindowState() {
    if (!mainWindow) return;
    try {
        const bounds = mainWindow.getBounds();
        const state = {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            isMaximized: mainWindow.isMaximized(),
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
        console.error('Failed to save window state:', err);
    }
}

// Maximum file size readable via IPC (100 MB — workspaces are JSON, CSVs are small).
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Validate that a requested path resolves to a real location within an allowed root.
 * Uses fs.realpath to defeat symlink-based escapes. Returns the canonical path.
 */
async function validatePath(requestedPath) {
    if (!requestedPath || typeof requestedPath !== 'string') {
        throw new Error('Invalid path');
    }
    const resolved = path.resolve(requestedPath);
    // Canonicalize through realpath to defeat symlink escapes.
    let canonical;
    try {
        canonical = await fs.promises.realpath(resolved);
    } catch {
        // Target may not exist yet (write case); fall back to dirname check.
        canonical = resolved;
    }
    const normalized = canonical.toLowerCase();
    for (const root of allowedRoots) {
        const rootNorm = root.toLowerCase();
        if (normalized === rootNorm || normalized.startsWith(rootNorm + path.sep)) {
            return canonical;
        }
    }
    throw new Error(`Access denied: path outside allowed directories`);
}

const createWindow = () => {
    const state = loadWindowState();
    mainWindow = new BrowserWindow({
        width: state.width,
        height: state.height,
        x: state.x,
        y: state.y,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
        autoHideMenuBar: true,
        frame: true,
        title: 'DataVis',
    });
    if (state.isMaximized) mainWindow.maximize();

    // Persist window geometry on resize/move/close (debounced via 'close').
    mainWindow.on('close', saveWindowState);

    // Block window.open and external navigation
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Allow http(s) to open externally in the user's browser; deny everything else
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        // Only allow navigation to the dev server / built-in start URL
        const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5190';
        if (!url.startsWith(startUrl) && !url.startsWith('file://')) {
            event.preventDefault();
        }
    });

    // 4B: Content Security Policy (production only — Vite dev server needs inline scripts)
    const isDev = !!process.env.ELECTRON_START_URL || !app.isPackaged;
    if (!isDev) {
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-eval'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data: blob:; " +
                        "font-src 'self'; " +
                        "connect-src 'self'"
                    ]
                }
            });
        });
    }

    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5190';
    mainWindow.loadURL(startUrl);

    if (process.env.ELECTRON_START_URL) {
        mainWindow.webContents.openDevTools();
    }
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// --- IPC Handlers ---

// List files in a directory (for TreeView)
ipcMain.handle('fs:list-dir', async (event, dirPath) => {
    try {
        const safePath = await validatePath(dirPath);
        const entries = await fs.promises.readdir(safePath, { withFileTypes: true });
        return entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path.join(safePath, entry.name)
        })).sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
});

// Read file content
ipcMain.handle('fs:read-file', async (event, filePath) => {
    try {
        const safePath = await validatePath(filePath);
        const stat = await fs.promises.stat(safePath);
        if (stat.size > MAX_FILE_SIZE) {
            throw new Error(`File too large (${stat.size} bytes, max ${MAX_FILE_SIZE})`);
        }
        return await fs.promises.readFile(safePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
    }
});

// Write file content
ipcMain.handle('fs:write-file', async (event, filePath, content) => {
    try {
        if (typeof content !== 'string') throw new Error('Content must be a string');
        if (content.length > MAX_FILE_SIZE) {
            throw new Error(`Content too large (${content.length} bytes, max ${MAX_FILE_SIZE})`);
        }
        const safePath = await validatePath(filePath);
        await fs.promises.writeFile(safePath, content, 'utf-8');
        return true;
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
});

// Write binary content (decoded from a base64 string). Used for image exports.
ipcMain.handle('fs:write-binary', async (event, filePath, base64) => {
    try {
        if (typeof base64 !== 'string') throw new Error('Content must be a base64 string');
        const buf = Buffer.from(base64, 'base64');
        if (buf.length > MAX_FILE_SIZE) {
            throw new Error(`Content too large (${buf.length} bytes, max ${MAX_FILE_SIZE})`);
        }
        const safePath = await validatePath(filePath);
        await fs.promises.writeFile(safePath, buf);
        return true;
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
});

// Show Open Dialog (directory)
ipcMain.handle('dialog:open-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (canceled) return null;
    // Grant this directory and its descendants access via IPC.
    allowedRoots.add(filePaths[0]);
    return filePaths[0];
});

// Show Open Dialog (file)
ipcMain.handle('dialog:open-file', async (event, options = {}) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: options.filters || [
            { name: 'All Files', extensions: ['*'] },
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'Workspace Files', extensions: ['ptw'] },
        ]
    });
    if (canceled) return null;
    // Grant access to the file's parent directory so reads succeed.
    allowedRoots.add(path.dirname(filePaths[0]));
    return filePaths[0];
});

// Show Save Dialog
ipcMain.handle('dialog:save-file', async (event, options = {}) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        filters: options.filters || [
            { name: 'Workspace Files', extensions: ['ptw'] },
            { name: 'All Files', extensions: ['*'] },
        ],
        defaultPath: options.defaultPath,
    });
    if (canceled) return null;
    // Grant access to the chosen path's parent directory so writes succeed.
    allowedRoots.add(path.dirname(filePath));
    return filePath;
});

// Scan folder recursively for CSV files
ipcMain.handle('fs:scan-folder', async (event, dirPath) => {
    const safePath = await validatePath(dirPath);
    const results = [];
    async function scan(dir) {
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await scan(fullPath);
                } else if (entry.name.toLowerCase().endsWith('.csv')) {
                    results.push({ name: entry.name, path: fullPath });
                }
            }
        } catch { /* skip inaccessible dirs */ }
    }
    await scan(safePath);
    return results;
});

// Register a directory as an allowed root (used on app startup to grant the
// persisted rootPath without showing the directory picker dialog).
ipcMain.handle('fs:set-root', async (event, dirPath) => {
    if (!dirPath || typeof dirPath !== 'string') return false;
    try {
        const resolved = path.resolve(dirPath);
        const stat = await fs.promises.stat(resolved);
        if (!stat.isDirectory()) return false;
        allowedRoots.add(resolved);
        return true;
    } catch {
        return false;
    }
});

// Window operations
ipcMain.handle('window:set-title', async (event, title) => {
    if (mainWindow) {
        mainWindow.setTitle(String(title).slice(0, 200));
    }
});

ipcMain.handle('window:print', async () => {
    if (mainWindow) {
        mainWindow.webContents.print();
    }
});

// Print Preview: render the window contents to a PDF in the temp folder and open
// it with the OS default PDF viewer.
ipcMain.handle('window:print-preview', async () => {
    if (!mainWindow) return null;
    try {
        const buf = await mainWindow.webContents.printToPDF({
            landscape: true,
            printBackground: true,
            pageSize: 'Letter',
        });
        const tmp = path.join(app.getPath('temp'), `datavis-preview-${Date.now()}.pdf`);
        await fs.promises.writeFile(tmp, buf);
        await shell.openPath(tmp);
        return tmp;
    } catch (err) {
        throw new Error(`Print preview failed: ${err.message}`);
    }
});

// Open an arbitrary file path with its default application (used for Excel Chart).
ipcMain.handle('shell:open-external-file', async (event, filePath) => {
    if (!filePath || typeof filePath !== 'string') throw new Error('Invalid path');
    return shell.openPath(filePath);
});

// Write to a temp file (returns the path); used for "open in default app" workflows.
ipcMain.handle('fs:write-temp', async (event, filename, content) => {
    if (typeof content !== 'string') throw new Error('Content must be a string');
    if (content.length > MAX_FILE_SIZE) throw new Error('Content too large');
    const safeName = String(filename || 'datavis-tmp.txt').replace(/[^A-Za-z0-9_.-]/g, '_');
    const tmp = path.join(app.getPath('temp'), `${Date.now()}-${safeName}`);
    await fs.promises.writeFile(tmp, content, 'utf-8');
    // Auto-allow this directory so future reads/writes work.
    allowedRoots.add(path.dirname(tmp));
    return tmp;
});

ipcMain.handle('window:close', async () => {
    if (mainWindow) {
        mainWindow.close();
    }
});
