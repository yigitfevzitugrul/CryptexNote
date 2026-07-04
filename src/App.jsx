import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [session, setSession] = useState(null); // { key, username }
  const [lang, setLang] = useState('tr');
  const [theme, setTheme] = useState('dark');

  React.useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLogin = (key, username) => {
    setSession({ key, username });
  };

  const handleLogout = () => {
    setSession(null);
  };

  const handlePasswordChanged = (newKey) => {
    setSession(prev => ({ ...prev, key: newKey }));
  };

  if (!session) {
    return <Login onLogin={handleLogin} lang={lang} />;
  }

  return (
    <ErrorBoundary>
      <Dashboard
        encryptionKey={session.key}
        username={session.username}
        onLogout={handleLogout}
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
