const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow;

// 4A: Track allowed root directory (updated when user opens a directory)
let allowedRoot = null;

/**
 * Validate that a requested path is within the allowed root directory.
 * Prevents path traversal attacks via IPC.
 */
function validatePath(requestedPath) {
    if (!requestedPath || typeof requestedPath !== 'string') {
        throw new Error('Invalid path');
    }
    const resolved = path.resolve(requestedPath);
    // Allow user home directory and subdirectories as a safety net
    const homeDir = os.homedir();
    if (resolved.startsWith(homeDir)) return resolved;
    // If an allowed root is set, check against it
    if (allowedRoot && resolved.startsWith(allowedRoot)) return resolved;
    throw new Error(`Access denied: path outside allowed directory`);
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        frame: true,
        title: 'PlotTool',
    });

    // 4B: Content Security Policy
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
                    "connect-src 'self' ws://localhost:* http://localhost:*"
                ]
            }
        });
    });

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
        const safePath = validatePath(dirPath);
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
        const safePath = validatePath(filePath);
        return await fs.promises.readFile(safePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
    }
});

// Write file content
ipcMain.handle('fs:write-file', async (event, filePath, content) => {
    try {
        const safePath = validatePath(filePath);
        await fs.promises.writeFile(safePath, content, 'utf-8');
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
    // Update allowed root when user explicitly selects a directory
    allowedRoot = filePaths[0];
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
    return filePath;
});

// Scan folder recursively for CSV files
ipcMain.handle('fs:scan-folder', async (event, dirPath) => {
    const safePath = validatePath(dirPath);
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

ipcMain.handle('window:close', async () => {
    if (mainWindow) {
        mainWindow.close();
    }
});
