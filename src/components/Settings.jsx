import React, { useState } from 'react';
import { translations } from '../utils/i18n';
import { deriveKey, encryptData, decryptData } from '../utils/crypto';
import { loadRawNotes, saveRawNotes, getAuthMetadata, saveAuthMetadata } from '../utils/storage';

export default function Settings({ lang, setLang, theme, setTheme, onPasswordChanged }) {
    const [currentTab, setCurrentTab] = useState('appearance');
    const t = translations[lang];

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
        { id: 'appearance', label: t.appearance, icon: '🎨' },
        { id: 'language', label: t.language, icon: '🌐' },
        { id: 'security', label: t.changePassword, icon: '🔒' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="header-bar" style={{ marginBottom: '1.75rem' }}>
                <div>
                    <h1 className="header-title">{t.settingsTitle}</h1>
                    <p className="header-subtitle">Uygulama tercihlerini yönet</p>
                </div>
            </div>

            <div className="settings-layout">
                {/* Settings sidebar */}
                <div className="settings-sidebar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab ${currentTab === tab.id ? 'active' : ''}`}
                            onClick={() => setCurrentTab(tab.id)}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Settings content */}
                <div className="settings-content">

                    {/* APPEARANCE TAB */}
                    {currentTab === 'appearance' && (
                        <div>
                            <div className="settings-section-title">🎨 {t.appearance}</div>
                            <div className="settings-section-desc">
                                Uygulama temasını kişiselleştir
                            </div>
                            <div className="option-grid">
                                <button
                                    className={`option-card ${theme === 'dark' ? 'selected' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <span className="option-icon">🌑</span>
                                    {t.darkMode}
                                </button>
                                <button
                                    className={`option-card ${theme === 'light' ? 'selected' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <span className="option-icon">☀️</span>
                                    {t.lightMode}
                                </button>
                            </div>

                            <div className="divider" style={{ marginTop: '2rem' }} />

                            <div style={{ 
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1rem 1.25rem',
                                fontSize: '0.82rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span>💡</span>
                                Seçilen tema tüm sayfalara uygulanır ve otomatik kaydedilir.
                            </div>
                        </div>
                    )}

                    {/* LANGUAGE TAB */}
                    {currentTab === 'language' && (
                        <div>
                            <div className="settings-section-title">🌐 {t.language}</div>
                            <div className="settings-section-desc">
                                Arayüz dilini seç
                            </div>
                            <div className="option-grid">
                                <button
                                    className={`option-card ${lang === 'tr' ? 'selected' : ''}`}
                                    onClick={() => setLang('tr')}
                                >
                                    <span className="option-icon">🇹🇷</span>
                                    Türkçe
                                </button>
                                <button
                                    className={`option-card ${lang === 'en' ? 'selected' : ''}`}
                                    onClick={() => setLang('en')}
                                >
                                    <span className="option-icon">🇬🇧</span>
                                    English
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {currentTab === 'security' && (
                        <div>
                            <div className="settings-section-title">🔒 {t.changePassword}</div>
                            <div className="settings-section-desc">
                                Şifreni değiştirirken tüm notlar otomatik olarak yeniden şifrelenir
                            </div>

                            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div className="input-group">
                                    <label>{t.currentPassword}</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        placeholder="Mevcut şifreni gir"
                                        required
                                    />
                                </div>

                                <div className="divider" />

                                <div className="input-group">
                                    <label>{t.newPassword}</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Yeni şifreni gir"
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label>{t.confirmPassword}</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Yeni şifreyi tekrar gir"
                                        required
                                    />
                                </div>

                                {passwordError && (
                                    <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                        ⚠️ {passwordError}
                                    </div>
                                )}
                                {passwordSuccess && (
                                    <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                                        ✓ {passwordSuccess}
                                    </div>
                                )}

                                <div>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <>
                                                <span className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                                {t.processing}
                                            </>
                                        ) : (
                                            <>🔑 {t.updatePassword}</>
                                        )}
                                    </button>
                                </div>
                            </form>

                            <div className="divider" />

                            <div style={{
                                background: 'var(--danger-subtle)',
                                border: '1px solid rgba(255,71,87,0.2)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1rem 1.25rem',
                                fontSize: '0.82rem',
                                color: 'var(--danger)',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'flex-start',
                            }}>
                                <span>⚠️</span>
                                <span>Şifreni unutursan notlarına bir daha erişemezsin. Güvenli bir yerde sakla!</span>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
