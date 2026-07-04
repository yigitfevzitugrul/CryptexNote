// update-exe.mjs
// Bu script vite build yapar ve sonra dist-electron içindeki exe'yi günceller.
// electron-builder'a gerek yok — winCodeSign hatası olmaz.

import { execSync } from 'child_process';
import { cpSync, copyFileSync, rmSync, existsSync } from 'fs';

const APP_DIR = 'dist-electron/win-unpacked/resources/app';

// Renklendirme
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

console.log(bold('\n🔨  Günlük - Uygulama Güncelleme Scripti\n'));

// Adım 1: Exe var mı kontrol et
if (!existsSync(APP_DIR)) {
    console.error(red('❌  dist-electron/win-unpacked bulunamadı!'));
    console.error(yellow('   Önce electron-builder ile ilk build yapılması gerekiyor.'));
    console.error(yellow('   Bunu yönetici olarak çalıştırarak yapabilirsin:\n'));
    console.error(yellow('   npm run electron:build\n'));
    process.exit(1);
}

// Adım 2: Vite build
console.log(yellow('📦  Adım 1/2: Vite ile kaynak kod derleniyor...'));
try {
    execSync('npx vite build', { stdio: 'inherit' });
    console.log(green('✓   Vite build tamamlandı.\n'));
} catch (e) {
    console.error(red('❌  Vite build başarısız!'));
    process.exit(1);
}

// Adım 3: dist klasörünü kopyala
console.log(yellow('📁  Adım 2/2: Dosyalar exe içine kopyalanıyor...'));
try {
    // dist/ → resources/app/dist/
    rmSync(`${APP_DIR}/dist`, { recursive: true, force: true });
    cpSync('dist', `${APP_DIR}/dist`, { recursive: true });

    // electron/ → resources/app/electron/
    rmSync(`${APP_DIR}/electron`, { recursive: true, force: true });
    cpSync('electron', `${APP_DIR}/electron`, { recursive: true });

    // package.json
    copyFileSync('package.json', `${APP_DIR}/package.json`);

    console.log(green('✓   Dosyalar kopyalandı.\n'));
} catch (e) {
    console.error(red('❌  Dosya kopyalama başarısız: ' + e.message));
    process.exit(1);
}

console.log(bold(green('🎉  Güncelleme tamamlandı!')));
console.log(green(`   Exe konumu: dist-electron\\win-unpacked\\Sifreli Not Defteri.exe\n`));
