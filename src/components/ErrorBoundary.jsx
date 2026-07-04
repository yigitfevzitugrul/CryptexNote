import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'white', background: '#0f172a', height: '100vh', boxSizing: 'border-box', overflow: 'auto' }}>
                    <h1 style={{ color: '#ef4444' }}>Bir hata oluştu / Something went wrong</h1>
                    <p>Lütfen bu hatayı geliştiriciye bildirin:</p>
                    <pre style={{ color: '#ef4444', background: '#1e293b', padding: '1rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                        Uygulamayı Yeniden Başlat / Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
