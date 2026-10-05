const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    exportPDF: () => ipcRenderer.send('export-pdf')
});
