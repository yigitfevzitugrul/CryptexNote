# Implementation Plan - Encrypted Notes App

## 1. Project Setup
- [x] Initialize Vite + React project.
- [x] Install dependencies.
- [x] Configure `index.css` for modern aesthetics (Dark mode, glassmorphism, variables).

## 2. Core Logic (Encryption & Storage)
- [x] Create `src/utils/crypto.js`:
    - `deriveKey(password)`: PBKDF2 to get a key from password.
    - `encrypt(text, key)`: AES-GCM encryption.
    - `decrypt(cipherText, key)`: AES-GCM decryption.
- [x] Create `src/utils/storage.js`:
    - `getNotes()`: specific key in localStorage.
    - `saveNote(note)`: append/update note.
    - `deleteNote(id)`.

## 3. UI Components
- [x] **Login Screen**:
    - Input for username/password.
    - On submit, derive key and attempt to decrypt a specific "check" value (or just store the key in memory and try to decrypt notes later).
    - Validation: Since it's local-first end-to-end encryption without a backend, "Correct password" is defined by "Can successfully decrypt the data".
    - *Correction*: The user asked for "Username and Password". I will simulate a user check by storing a hash of the username+password OR encrypting a "canary" string. If decryption works, login is successful.
- [x] **Dashboard**:
    - List of notes (Title, Date).
    - Grid layout with cards.
    - "Add Note" button.
- [x] **Note Editor**:
    - Title input.
    - Textarea for content.
    - Save/Cancel buttons.

## 4. Integration
- [x] Update `App.jsx` to handle routing (Login <-> Dashboard).
- [x] Ensure state is cleared on refresh (Security).

## 5. Desktop Application (Electron) Conversion
- [x] Install Electron dependencies (`electron`, `electron-builder`, `concurrently`, `wait-on`).
- [x] Configure `electron/main.js` to create the application window.
- [x] Update `vite.config.js` for relative path handling (`base: './'`).
- [x] Update `package.json` with `main` entry and new scripts (`electron:dev`, `electron:build`).
- [ ] Verify functionality in Desktop environment.

## 6. Functional Enhancements
- [x] **Sidebar Navigation**:
    - Add left sidebar to Dashboard.
    - Menu items: "Notlarım" (Notes), "Ayarlar" (Settings).
- [x] **Settings Panel**:
    - Create `src/components/Settings.jsx`.
    - **Language**: Implement English/Turkish toggle (`src/utils/i18n.js`).
    - **Appearance**: Implement Light/Dark mode toggle (modify `index.css` vars).
    - **Change Password**: Implement re-encryption logic (Decrypt all -> Derive new key -> Encrypt all).
- [x] **Refactoring**:
    - Update `Dashboard.jsx` to manage views (Notes vs Settings).

## 7. Polish
- [ ] Verify functionality in Desktop environment.
- [ ] Add animations.
