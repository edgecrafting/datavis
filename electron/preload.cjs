const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    fs: {
        listDir: (path) => ipcRenderer.invoke('fs:list-dir', path),
        readFile: (path) => ipcRenderer.invoke('fs:read-file', path),
        writeFile: (path, content) => ipcRenderer.invoke('fs:write-file', path, content),
        writeBinary: (path, base64) => ipcRenderer.invoke('fs:write-binary', path, base64),
        scanFolder: (path) => ipcRenderer.invoke('fs:scan-folder', path),
        setRoot: (path) => ipcRenderer.invoke('fs:set-root', path),
        writeTemp: (filename, content) => ipcRenderer.invoke('fs:write-temp', filename, content),
    },
    dialog: {
        openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
        openFile: (options) => ipcRenderer.invoke('dialog:open-file', options),
        saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options),
    },
    window: {
        setTitle: (title) => ipcRenderer.invoke('window:set-title', title),
        print: () => ipcRenderer.invoke('window:print'),
        printPreview: () => ipcRenderer.invoke('window:print-preview'),
        close: () => ipcRenderer.invoke('window:close'),
    },
    shell: {
        openExternalFile: (path) => ipcRenderer.invoke('shell:open-external-file', path),
    },
    platform: process.platform
});
