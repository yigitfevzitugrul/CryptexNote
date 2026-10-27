import React, { useCallback, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { getAutoLockMinutes, saveAutoLockMinutes } from './utils/storage';

function App() {
  const [session, setSession] = useState(null); // { key, username }
  const [lang, setLang] = useState('tr');
  const [theme, setTheme] = useState('light');
  const [autoLockMinutes, setAutoLockMinutesState] = useState(getAutoLockMinutes);
  const [lockedByIdle, setLockedByIdle] = useState(false);

  React.useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Büyük harf dönüşümü (text-transform) dile göre doğru çalışsın: i → İ / I
  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const handleLogin = (key, username) => {
    setLockedByIdle(false);
    setSession({ key, username });
  };

  const handleLogout = () => {
    setSession(null);
  };

  // Hareketsizlik kilidi: oturum (ve şifreleme anahtarı) bellekten silinir
  const handleAutoLock = useCallback(() => {
    setSession(null);
    setLockedByIdle(true);
  }, []);

  const setAutoLockMinutes = (minutes) => {
    saveAutoLockMinutes(minutes);
    setAutoLockMinutesState(minutes);
  };

  const handlePasswordChanged = (newKey) => {
    setSession(prev => ({ ...prev, key: newKey }));
  };

  if (!session) {
    return <Login onLogin={handleLogin} lang={lang} lockedByIdle={lockedByIdle} />;
  }

  return (
    <ErrorBoundary>
      <Dashboard
        encryptionKey={session.key}
        username={session.username}
        onLogout={handleLogout}
        onAutoLock={handleAutoLock}
        autoLockMinutes={autoLockMinutes}
        setAutoLockMinutes={setAutoLockMinutes}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onPasswordChanged={handlePasswordChanged}
      />
    </ErrorBoundary>
  );
}

export default App;
