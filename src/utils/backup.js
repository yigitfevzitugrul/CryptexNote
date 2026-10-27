// Şifreli yedekleme / geri yükleme.
// Yedek dosyası notları ŞİFRELİ hâlde içerir; şifre olmadan okunamaz.
// Geri yüklemede notlar yedeğin şifresiyle çözülüp mevcut anahtarla yeniden şifrelenir,
// böylece yedek aldıktan sonra şifre değiştirilmiş olsa da geri yükleme çalışır.
import { deriveKey, encryptData, decryptData } from './crypto';
import { loadRawNotes, saveRawNotes, getAuthMetadata } from './storage';

export const BACKUP_FORMAT = 'gunluk-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

export class BackupError extends Error {
    constructor(code) {
        super(code);
        this.code = code; // 'invalid' | 'wrong-password' | 'no-account'
    }
}

export function createBackup() {
    const meta = getAuthMetadata();
    if (!meta) throw new BackupError('no-account');
    const notes = loadRawNotes();
    return JSON.stringify({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        username: meta.username,
        authCheck: meta.authCheck,
        notes: Array.isArray(notes) ? notes : [],
    }, null, 2);
}

export function backupFileName(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `gunluk-yedek-${y}-${m}-${d}.json`;
}

export function parseBackup(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new BackupError('invalid');
    }
    const valid = data
        && data.format === BACKUP_FORMAT
        && Number.isInteger(data.version)
        && data.version >= 1
        && data.version <= BACKUP_VERSION
        && typeof data.username === 'string'
        && typeof data.authCheck === 'string'
        && Array.isArray(data.notes);
    if (!valid) throw new BackupError('invalid');
    return data;
}

function safeParse(json) {
    if (!json) return null;
    try {
        const value = JSON.parse(json);
        return value && typeof value === 'object' ? value : null;
    } catch {
        return null;
    }
}

/**
 * Yedeği mevcut notlarla birleştirir. Hiçbir not silinmez.
 * Aynı not iki tarafta da varsa düzenleme tarihi daha yeni olan tutulur.
 */
export async function restoreBackup(backup, password, currentKey) {
    const backupKey = await deriveKey(password, backup.username);
    if ((await decryptData(backup.authCheck, backupKey)) !== 'CORRECT') {
        throw new BackupError('wrong-password');
    }

    const current = loadRawNotes();
    const byId = new Map((Array.isArray(current) ? current : []).map(n => [n.id, n]));
    const result = { added: 0, updated: 0, skipped: 0, failed: 0 };

    for (const item of backup.notes) {
        if (!item || typeof item.id !== 'string' || typeof item.encryptedData !== 'string') {
            result.failed++;
            continue;
        }
        const json = await decryptData(item.encryptedData, backupKey);
        const note = safeParse(json);
        if (!note) {
            result.failed++;
            continue;
        }

        const existing = byId.get(item.id);
        if (existing) {
            const existingNote = safeParse(await decryptData(existing.encryptedData, currentKey));
            if (existingNote && new Date(existingNote.date) >= new Date(note.date)) {
                result.skipped++;
                continue;
            }
            result.updated++;
        } else {
            result.added++;
        }
        byId.set(item.id, { id: item.id, encryptedData: await encryptData(json, currentKey) });
    }

    if (result.added || result.updated) saveRawNotes([...byId.values()]);
    return result;
}
