import React, { useState } from 'react';
import { deriveKey, encryptData, decryptData } from '../utils/crypto';
import { hasUser, getAuthMetadata, saveAuthMetadata, saveLastUsername, getLastUsername } from '../utils/storage';
import { translations } from '../utils/i18n';
import Icon, { Seal } from './Icon';

export default function Login({ onLogin, lang = 'tr', lockedByIdle = false }) {
    const isNewUser = !hasUser();
    const storedMetadata = getAuthMetadata();

    // Username'i önce authMetadata'dan, yoksa ayrı kaydedilen son username'den al
    const savedUsername = storedMetadata?.username || getLastUsername();

    const [username, setUsername] = useState(savedUsername || '');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const t = translations[lang] || translations.tr;

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
            <section className="login-cover clay" aria-hidden="true">
                <span className="float-tile t1"><Icon name="lock" size={30} strokeWidth={2.2} /></span>
                <span className="float-tile t2"><Icon name="notes" size={24} strokeWidth={2.2} /></span>
                <span className="float-tile t3"><Icon name="key" size={26} strokeWidth={2.2} /></span>

                <div className="brand">
                    <Seal size={40} />
                    <span className="brand-name">Günlük</span>
                </div>

                <div className="login-quote">
                    <span className="pill"><span className="pill-dot" />{t.coverEyebrow}</span>
                    <h2>
                        {t.coverTitleA} <em>{t.coverTitleEm}</em> {t.coverTitleB}
                    </h2>
                    <p>{t.coverText}</p>
                </div>

                <ul className="spec-list">
                    <li className="pill">AES-GCM 256</li>
                    <li className="pill">PBKDF2 · 100k</li>
                    <li className="pill">{lang === 'tr' ? 'Yalnızca bu cihaz' : 'This device only'}</li>
                </ul>
            </section>

            <main className="login-panel">
                <div className="login-form-wrap clay">
                    <div className="brand">
                        <Seal size={36} />
                        <span className="brand-name">Günlük</span>
                    </div>

                    <span className="eyebrow">{isNewUser ? t.registerTitle : t.loginTitle}</span>
                    <h1 className="login-title">
                        {isNewUser
                            ? (lang === 'tr' ? 'Defterini mühürle.' : 'Seal your notebook.')
                            : (lang === 'tr' ? 'Tekrar hoş geldin.' : 'Welcome back.')}
                    </h1>
                    <p className="login-subtitle">
                        {isNewUser ? t.registerSubtitle : t.loginSubtitle}
                    </p>

                    {lockedByIdle && !isNewUser && (
                        <div className="notice notice-warning" role="status">
                            <Icon name="timer" size={16} />
                            <span>{t.lockedNotice}</span>
                        </div>
                    )}

                    {isNewUser && (
                        <div className="notice notice-warning" role="note">
                            <Icon name="alert" size={16} />
                            <span>{t.newDeviceWarning}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="field">
                            <label className="field-label" htmlFor="login-username">{t.username}</label>
                            <input
                                id="login-username"
                                className="input"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder={t.usernamePlaceholder}
                                required
                                autoFocus={isNewUser && !savedUsername}
                            />
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="login-password">{t.password}</label>
                            <input
                                id="login-password"
                                className="input"
                                type="password"
                                autoComplete={isNewUser ? 'new-password' : 'current-password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                aria-invalid={!!error}
                                aria-describedby={error ? 'login-error' : undefined}
                                autoFocus={!isNewUser || !!savedUsername}
                            />
                        </div>

                        {error && (
                            <div className="notice notice-error" id="login-error" role="alert">
                                <Icon name="alert" size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg btn-full"
                            disabled={loading}
                            aria-busy={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" aria-hidden="true" />
                                    {t.processing}
                                </>
                            ) : (
                                <>
                                    <Icon name="lock" size={16} />
                                    {isNewUser ? t.registerButton : t.loginButton}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-foot eyebrow">
                        <Icon name="lock" size={12} />
                        {t.localStorageNote}
                    </div>
                </div>
            </main>
        </div>
    );
}
