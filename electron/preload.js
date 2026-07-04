const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Tam ekran toggle
    toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
    isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
    onFullscreenChange: (callback) => {
        ipcRenderer.on('fullscreen-changed', (_, isFS) => callback(isFS));
        return () => ipcRenderer.removeAllListeners('fullscreen-changed');
    },
});
