import React, { useRef, useState } from 'react';
import { translations } from '../utils/i18n';
import Icon from './Icon';
import { deriveKey, encryptData, decryptData } from '../utils/crypto';
import { loadRawNotes, saveRawNotes, getAuthMetadata, saveAuthMetadata } from '../utils/storage';
import { createBackup, backupFileName, parseBackup, restoreBackup, MAX_BACKUP_BYTES } from '../utils/backup';

// Otomatik kilit seçenekleri (dakika, 0 = kapalı)
const AUTO_LOCK_OPTIONS = [0, 1, 5, 15, 30, 60];

function CheckMark() {
    return (
        <span className="option-check" aria-hidden="true">
            <Icon name="check" size={12} strokeWidth={3} />
        </span>
    );
}

export default function Settings({
    lang, setLang, theme, setTheme, onPasswordChanged,
    encryptionKey, onNotesImported, autoLockMinutes, setAutoLockMinutes,
}) {
    const [currentTab, setCurrentTab] = useState('appearance');
    const t = translations[lang] || translations.tr;

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [processing, setProcessing] = useState(false);

    // Yedekleme durumu
    const [exportMsg, setExportMsg] = useState(null); // { type, text }
    const [importFile, setImportFile] = useState(null); // { name, data }
    const [importPassword, setImportPassword] = useState('');
    const [importMsg, setImportMsg] = useState(null);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    async function handleExport() {
        setExportMsg(null);
        try {
            const content = createBackup();
            const name = backupFileName();
            if (window.electronAPI?.saveBackup) {
                // Masaüstü: yerel "Farklı Kaydet" penceresi
                const res = await window.electronAPI.saveBackup(content, name);
                if (res?.ok) setExportMsg({ type: 'success', text: `${t.exportDone} ${res.filePath}` });
                else if (!res?.canceled) setExportMsg({ type: 'error', text: t.backupError });
            } else {
                // Tarayıcı: dosya indirme
                const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setExportMsg({ type: 'success', text: `${t.exportDoneWeb} ${name}` });
            }
        } catch (err) {
            console.error(err);
            setExportMsg({ type: 'error', text: t.backupError });
        }
    }

    async function handleFileChosen(e) {
        setImportMsg(null);
        setImportFile(null);
        const file = e.target.files?.[0];
        e.target.value = ''; // aynı dosya tekrar seçilebilsin
        if (!file) return;
        if (file.size > MAX_BACKUP_BYTES) {
            setImportMsg({ type: 'error', text: t.invalidBackup });
            return;
        }
        try {
            const data = parseBackup(await file.text());
            setImportFile({ name: file.name, data });
        } catch {
            setImportMsg({ type: 'error', text: t.invalidBackup });
        }
    }

    async function handleImport(e) {
        e.preventDefault();
        if (!importFile) return;
        setImporting(true);
        setImportMsg(null);
        try {
            const r = await restoreBackup(importFile.data, importPassword, encryptionKey);
            let text = `${r.added} ${t.importAdded}, ${r.updated} ${t.importUpdated}, ${r.skipped} ${t.importSkipped}`;
            if (r.failed) text += `, ${r.failed} ${t.importFailed}`;
            setImportMsg({ type: 'success', text: `${text}.` });
            setImportFile(null);
            setImportPassword('');
            if (r.added || r.updated) await onNotesImported?.();
        } catch (err) {
            if (err?.code !== 'wrong-password') console.error(err);
            setImportMsg({ type: 'error', text: err?.code === 'wrong-password' ? t.wrongBackupPassword : t.backupError });
        } finally {
            setImporting(false);
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError(t.passwordMismatch);
            return;
        }

        setProcessing(true);

        try {
            const metadata = getAuthMetadata();
            const oldKey = await deriveKey(currentPassword, metadata.username);
            const checkResult = await decryptData(metadata.authCheck, oldKey);

            if (checkResult !== "CORRECT") {
                throw new Error("Mevcut şifre hatalı.");
            }

            const rawNotes = loadRawNotes();
            const decryptedNotes = [];

            for (const note of rawNotes) {
                const json = await decryptData(note.encryptedData, oldKey);
                if (json) {
                    decryptedNotes.push({ id: note.id, json });
                }
            }

            const newKey = await deriveKey(newPassword, metadata.username);

            const newRawNotes = [];
            for (const note of decryptedNotes) {
                const encryptedData = await encryptData(note.json, newKey);
                newRawNotes.push({ id: note.id, encryptedData });
            }

            const newAuthCheck = await encryptData("CORRECT", newKey);

            saveRawNotes(newRawNotes);
            saveAuthMetadata({ ...metadata, authCheck: newAuthCheck });

            setPasswordSuccess(t.passwordChanged);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onPasswordChanged(newKey);

        } catch (err) {
            console.error(err);
            setPasswordError(t.errorChangingPassword + " " + (err.message || ""));
        } finally {
            setProcessing(false);
        }
    }

    const tabs = [
        { id: 'appearance', label: t.appearance, icon: 'palette' },
        { id: 'language', label: t.language, icon: 'globe' },
        { id: 'security', label: t.changePassword, icon: 'key' },
        { id: 'autolock', label: t.autoLock, icon: 'timer' },
        { id: 'backup', label: t.backup, icon: 'archive' },
    ];

    return (
        <div>
            <header className="page-header">
                <div>
                    <span className="eyebrow">{t.settingsSubtitle}</span>
                    <h1 className="page-title">{t.settingsTitle}</h1>
                </div>
            </header>

            <div className="settings-layout">
                <nav className="settings-tabs clay" aria-label={t.settingsTitle}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`nav-item ${currentTab === tab.id ? 'active' : ''}`}
                            onClick={() => setCurrentTab(tab.id)}
                            aria-current={currentTab === tab.id ? 'true' : undefined}
                        >
                            <Icon name={tab.icon} size={17} />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="settings-content clay" key={currentTab}>

                    {/* APPEARANCE TAB */}
                    {currentTab === 'appearance' && (
                        <section>
                            <h2 className="settings-section-title">{t.appearance}</h2>
                            <p className="settings-section-desc">{t.appearanceDesc}</p>
                            <div className="option-grid" role="radiogroup" aria-label={t.appearance}>
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={theme === 'dark'}
                                    className={`option-card ${theme === 'dark' ? 'selected' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <span className="theme-preview dark" aria-hidden="true"><i /><i /><i /></span>
                                    <span className="option-card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Icon name="moon" size={16} />
                                        {t.darkMode}
                                    </span>
                                    <CheckMark />
                                </button>
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={theme === 'light'}
                                    className={`option-card ${theme === 'light' ? 'selected' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <span className="theme-preview light" aria-hidden="true"><i /><i /><i /></span>
                                    <span className="option-card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Icon name="sun" size={16} />
                                        {t.lightMode}
                                    </span>
                                    <CheckMark />
                                </button>
                            </div>
                        </section>
                    )}

                    {/* LANGUAGE TAB */}
                    {currentTab === 'language' && (
                        <section>
                            <h2 className="settings-section-title">{t.language}</h2>
                            <p className="settings-section-desc">{t.languageDesc}</p>
                            <div className="option-grid" role="radiogroup" aria-label={t.language}>
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={lang === 'tr'}
                                    className={`option-card ${lang === 'tr' ? 'selected' : ''}`}
                                    onClick={() => setLang('tr')}
                                >
                                    <span className="lang-badge" aria-hidden="true">TR</span>
                                    <span className="option-card-label">Türkçe</span>
                                    <CheckMark />
                                </button>
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={lang === 'en'}
                                    className={`option-card ${lang === 'en' ? 'selected' : ''}`}
                                    onClick={() => setLang('en')}
                                >
                                    <span className="lang-badge" aria-hidden="true">EN</span>
                                    <span className="option-card-label">English</span>
                                    <CheckMark />
                                </button>
                            </div>
                        </section>
                    )}

                    {/* SECURITY TAB */}
                    {currentTab === 'security' && (
                        <section>
                            <h2 className="settings-section-title">{t.changePassword}</h2>
                            <p className="settings-section-desc">{t.securityDesc}</p>

                            <form onSubmit={handleChangePassword}>
                                <div className="field">
                                    <label className="field-label" htmlFor="current-password">{t.currentPassword}</label>
                                    <input
                                        id="current-password"
                                        className="input"
                                        type="password"
                                        autoComplete="current-password"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        placeholder={t.currentPasswordPlaceholder}
                                        required
                                    />
                                </div>

                                <div className="settings-divider" />

                                <div className="field">
                                    <label className="field-label" htmlFor="new-password">{t.newPassword}</label>
                                    <input
                                        id="new-password"
                                        className="input"
                                        type="password"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder={t.newPasswordPlaceholder}
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label className="field-label" htmlFor="confirm-password">{t.confirmPassword}</label>
                                    <input
                                        id="confirm-password"
                                        className="input"
                                        type="password"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder={t.confirmPasswordPlaceholder}
                                        required
                                    />
                                </div>

                                {passwordError && (
                                    <div className="notice notice-error" role="alert">
                                        <Icon name="alert" size={16} />
                                        <span>{passwordError}</span>
                                    </div>
                                )}
                                {passwordSuccess && (
                                    <div className="notice notice-success" role="status">
                                        <Icon name="check" size={16} />
                                        <span>{passwordSuccess}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={processing}
                                    aria-busy={processing}
                                >
                                    {processing ? (
                                        <>
                                            <span className="spinner" aria-hidden="true" />
                                            {t.processing}
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="key" size={16} />
                                            {t.updatePassword}
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="settings-divider" />

                            <div className="notice notice-warning" role="note">
                                <Icon name="alert" size={16} />
                                <span>{t.forgetWarning}</span>
                            </div>
                        </section>
                    )}


                    {/* AUTO-LOCK TAB */}
                    {currentTab === 'autolock' && (
                        <section>
                            <h2 className="settings-section-title">{t.autoLock}</h2>
                            <p className="settings-section-desc">{t.autoLockDesc}</p>
                            <div className="choice-grid" role="radiogroup" aria-label={t.autoLock}>
                                {AUTO_LOCK_OPTIONS.map(min => (
                                    <button
                                        key={min}
                                        type="button"
                                        role="radio"
                                        aria-checked={autoLockMinutes === min}
                                        className={`choice-chip ${autoLockMinutes === min ? 'selected' : ''}`}
                                        onClick={() => setAutoLockMinutes(min)}
                                    >
                                        {min === 0 ? t.autoLockOff : `${min} ${t.minutes}`}
                                    </button>
                                ))}
                            </div>
                            <div className="settings-divider" />
                            <div className={`notice ${autoLockMinutes ? 'notice-success' : 'notice-warning'}`} role="status">
                                <Icon name={autoLockMinutes ? 'lock' : 'alert'} size={16} />
                                <span>
                                    {autoLockMinutes
                                        ? `${t.autoLockActive} ${autoLockMinutes} ${t.minutes}.`
                                        : t.autoLockOffWarning}
                                </span>
                            </div>
                        </section>
                    )}

                    {/* BACKUP TAB */}
                    {currentTab === 'backup' && (
                        <section>
                            <h2 className="settings-section-title">{t.backup}</h2>
                            <p className="settings-section-desc">{t.backupDesc}</p>

                            <h3 className="settings-subtitle">{t.exportBackup}</h3>
                            <p className="settings-hint">{t.exportHint}</p>
                            <button type="button" className="btn btn-primary" onClick={handleExport}>
                                <Icon name="download" size={16} />
                                {t.exportBackup}
                            </button>
                            {exportMsg && (
                                <div className={`notice notice-${exportMsg.type} backup-msg`} role={exportMsg.type === 'error' ? 'alert' : 'status'}>
                                    <Icon name={exportMsg.type === 'error' ? 'alert' : 'check'} size={16} />
                                    <span className="backup-msg-text">{exportMsg.text}</span>
                                </div>
                            )}

                            <div className="settings-divider" />

                            <h3 className="settings-subtitle">{t.importBackup}</h3>
                            <p className="settings-hint">{t.importDesc}</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                className="visually-hidden"
                                tabIndex={-1}
                                aria-hidden="true"
                                onChange={handleFileChosen}
                            />
                            <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                <Icon name="upload" size={16} />
                                {t.chooseFile}
                            </button>

                            {importFile && (
                                <form onSubmit={handleImport} className="import-form">
                                    <p className="settings-hint">
                                        <strong>{t.selectedFile}:</strong> {importFile.name} · {importFile.data.notes.length} {importFile.data.notes.length === 1 ? t.notesCountOne : t.notesCount}
                                    </p>
                                    <div className="field">
                                        <label className="field-label" htmlFor="backup-password">{t.backupPassword}</label>
                                        <input
                                            id="backup-password"
                                            className="input"
                                            type="password"
                                            autoComplete="off"
                                            value={importPassword}
                                            onChange={e => setImportPassword(e.target.value)}
                                            placeholder={t.backupPasswordPlaceholder}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={importing} aria-busy={importing}>
                                        {importing ? (
                                            <>
                                                <span className="spinner" aria-hidden="true" />
                                                {t.processing}
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="upload" size={16} />
                                                {t.restore}
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {importMsg && (
                                <div className={`notice notice-${importMsg.type} backup-msg`} role={importMsg.type === 'error' ? 'alert' : 'status'}>
                                    <Icon name={importMsg.type === 'error' ? 'alert' : 'check'} size={16} />
                                    <span>{importMsg.text}</span>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
