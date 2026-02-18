const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    fs: {
        listDir: (path) => ipcRenderer.invoke('fs:list-dir', path),
        readFile: (path) => ipcRenderer.invoke('fs:read-file', path),
        writeFile: (path, content) => ipcRenderer.invoke('fs:write-file', path, content),
        scanFolder: (path) => ipcRenderer.invoke('fs:scan-folder', path),
    },
    dialog: {
        openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
        openFile: (options) => ipcRenderer.invoke('dialog:open-file', options),
        saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options),
    },
    window: {
        setTitle: (title) => ipcRenderer.invoke('window:set-title', title),
        print: () => ipcRenderer.invoke('window:print'),
        close: () => ipcRenderer.invoke('window:close'),
    },
    platform: process.platform
});
