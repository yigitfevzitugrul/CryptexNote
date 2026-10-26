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
                <div className="error-screen" role="alert">
                    <span className="eyebrow">Hata / Error</span>
                    <h1>Bir hata oluştu / Something went wrong</h1>
                    <p>Lütfen bu hatayı geliştiriciye bildirin:</p>
                    <pre>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                    <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
                        Uygulamayı Yeniden Başlat / Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
