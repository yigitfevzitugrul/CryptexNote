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
