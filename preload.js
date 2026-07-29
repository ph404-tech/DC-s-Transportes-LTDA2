const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getTelemetry: () => ipcRenderer.invoke('get-telemetry')
});
