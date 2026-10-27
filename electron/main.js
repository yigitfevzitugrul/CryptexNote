import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { writeFile } from 'fs/promises';
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
        backgroundColor: '#FFF9F5',
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

// IPC: Şifreli yedeği kullanıcının seçtiği konuma kaydet
const MAX_BACKUP_BYTES = 200 * 1024 * 1024;
ipcMain.handle('save-backup', async (_event, payload) => {
    const content = payload?.content;
    const defaultName = typeof payload?.defaultName === 'string'
        ? path.basename(payload.defaultName).replace(/[^\w.-]/g, '_')
        : 'gunluk-yedek.json';
    if (typeof content !== 'string' || content.length === 0 || content.length > MAX_BACKUP_BYTES) {
        return { ok: false, error: 'invalid-content' };
    }

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Yedeği kaydet',
        defaultPath: path.join(app.getPath('documents'), defaultName),
        filters: [{ name: 'Günlük yedeği', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    await writeFile(filePath, content, 'utf-8');
    return { ok: true, filePath };
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
