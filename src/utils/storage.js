const NOTES_KEY = 'encrypted_notes_db';
const AUTH_KEY = 'auth_metadata';
const LAST_USERNAME_KEY = 'last_username';

// Loads raw encrypted notes
export function loadRawNotes() {
    const data = localStorage.getItem(NOTES_KEY);
    return data ? JSON.parse(data) : [];
}

// Saves encrypted notes
export function saveRawNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

// Check if user is already registered
export function hasUser() {
    return !!localStorage.getItem(AUTH_KEY);
}

// Get auth metadata (encryption challenge)
export function getAuthMetadata() {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
}

// Save auth metadata
export function saveAuthMetadata(metadata) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(metadata));
}

// Save last used username separately for auto-fill
export function saveLastUsername(username) {
    localStorage.setItem(LAST_USERNAME_KEY, username);
}

// Get last used username
export function getLastUsername() {
    return localStorage.getItem(LAST_USERNAME_KEY) || '';
}


// ── Tercihler (gizli bilgi içermez, şifrelenmez) ──────────────────
const AUTO_LOCK_KEY = 'pref_auto_lock_minutes';
export const DEFAULT_AUTO_LOCK_MINUTES = 5;

// 0 = kapalı. Geçersiz/okunamayan değerde varsayılan kullanılır.
export function getAutoLockMinutes() {
    try {
        const raw = localStorage.getItem(AUTO_LOCK_KEY);
        if (raw === null) return DEFAULT_AUTO_LOCK_MINUTES;
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0 && value <= 1440 ? value : DEFAULT_AUTO_LOCK_MINUTES;
    } catch {
        return DEFAULT_AUTO_LOCK_MINUTES;
    }
}

export function saveAutoLockMinutes(minutes) {
    try {
        localStorage.setItem(AUTO_LOCK_KEY, String(minutes));
    } catch {
        // Depolama kullanılamıyorsa tercih yalnızca bu oturumda geçerli olur
    }
}
