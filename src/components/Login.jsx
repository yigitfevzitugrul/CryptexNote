import React, { useState } from 'react';
import { deriveKey, encryptData, decryptData } from '../utils/crypto';
import { hasUser, getAuthMetadata, saveAuthMetadata, saveLastUsername, getLastUsername } from '../utils/storage';
import { translations } from '../utils/i18n';

export default function Login({ onLogin, lang = 'tr' }) {
    const isNewUser = !hasUser();
    const storedMetadata = getAuthMetadata();

    // Username'i önce authMetadata'dan, yoksa ayrı kaydedilen son username'den al
    const savedUsername = storedMetadata?.username || getLastUsername();

    const [username, setUsername] = useState(savedUsername || '');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const t = translations[lang];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const key = await deriveKey(password, username);

            if (isNewUser) {
                const authCheck = await encryptData("CORRECT", key);
                saveAuthMetadata({ username, authCheck });
                saveLastUsername(username);
                onLogin(key, username);
            } else {
                const metadata = getAuthMetadata();
                if (metadata.username !== username) {
                    throw new Error('Kullanıcı adı yanlış veya veritabanı ile eşleşmiyor.');
                }
                const checkResult = await decryptData(metadata.authCheck, key);
                if (checkResult === "CORRECT") {
                    saveLastUsername(username);
                    onLogin(key, username);
                } else {
                    throw new Error('Hatalı şifre.');
                }
            }
        } catch (err) {
            setError(err.message || t.authError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen">
            {/* Background glow orbs */}
            <div className="login-bg-glow login-bg-glow-1" />
            <div className="login-bg-glow login-bg-glow-2" />

            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                    <h1 className="login-title">
                        {isNewUser ? t.registerTitle : t.loginTitle}
                    </h1>
                    <p className="login-subtitle">
                        {isNewUser
                            ? 'Güvenli notlarına erişmek için bir hesap oluştur'
                            : 'Şifreli notlarına erişmek için giriş yap'
                        }
                    </p>
                </div>

                {isNewUser && (
                    <div className="login-alert">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span>{t.newDeviceWarning}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>{t.username}</label>
                        <input
                            className="form-input"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Kullanıcı adın"
                            required
                            autoFocus={isNewUser && !savedUsername}
                        />
                    </div>

                    <div className="input-group">
                        <label>{t.password}</label>
                        <input
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoFocus={!isNewUser || !!savedUsername}
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-full"
                        disabled={loading}
                        style={{ marginTop: '0.5rem' }}
                    >
                        {loading ? (
                            <>
                                <span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                                {t.processing}
                            </>
                        ) : (
                            isNewUser ? t.registerButton : t.loginButton
                        )}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Uçtan uca şifrelenmiş · Yerel depolama
                    </p>
                </div>
            </div>
        </div>
    );
}
