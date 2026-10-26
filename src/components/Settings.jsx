import React, { useState } from 'react';
import { translations } from '../utils/i18n';
import Icon from './Icon';
import { deriveKey, encryptData, decryptData } from '../utils/crypto';
import { loadRawNotes, saveRawNotes, getAuthMetadata, saveAuthMetadata } from '../utils/storage';

function CheckMark() {
    return (
        <span className="option-check" aria-hidden="true">
            <Icon name="check" size={12} strokeWidth={3} />
        </span>
    );
}

export default function Settings({ lang, setLang, theme, setTheme, onPasswordChanged }) {
    const [currentTab, setCurrentTab] = useState('appearance');
    const t = translations[lang] || translations.tr;

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [processing, setProcessing] = useState(false);

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

                </div>
            </div>
        </div>
    );
}
