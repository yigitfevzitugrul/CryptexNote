import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Hız optimizasyonları ──────────────────────────────────────────
// GPU rasterizasyonu etkinleştir
app.commandLine.appendSwitch('enable-gpu-rasterization');
// V8 önbelleğini kullan
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
// Gereksiz ağ isteklerini engelle
app.commandLine.appendSwitch('disable-http-cache', 'false');
// ─────────────────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        // Pencereyi içerik yüklenene kadar gizle — beyaz flash engellenir
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // Önbelleklemeyi etkinleştir
            backgroundThrottling: false,
            // V8 snapshot önbelleği
            v8CacheOptions: 'bypassHeatCheck',
        },
        autoHideMenuBar: true,
        // Arka plan rengi hemen göster — beyaz flash olmaz
        backgroundColor: '#070b14',
        // Frame özelleştirme
        frame: true,
        titleBarStyle: 'default',
    });

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        // Exe içindeki doğru path
        const distPath = path.join(__dirname, '../dist/index.html');
        mainWindow.loadFile(distPath);
    }

    // İçerik hazır olunca göster — pürüzsüz açılış
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Tam ekran değişince renderer'ı bilgilendir
    mainWindow.on('enter-full-screen', () => {
        mainWindow.webContents.send('fullscreen-changed', true);
    });
    mainWindow.on('leave-full-screen', () => {
        mainWindow.webContents.send('fullscreen-changed', false);
    });

    // Yüklenme hatalarını yakala
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Yükleme hatası:', errorCode, errorDescription);
    });
}

// IPC: Tam ekran toggle
ipcMain.handle('toggle-fullscreen', () => {
    if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
        return mainWindow.isFullScreen();
    }
    return false;
});

// IPC: Tam ekran durumu sorgula
ipcMain.handle('is-fullscreen', () => {
    return mainWindow ? mainWindow.isFullScreen() : false;
});

// App hazır olunca pencereyi aç
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
