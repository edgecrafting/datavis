import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100%', color: '#c00', background: '#fff',
                    padding: '16px', textAlign: 'center'
                }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                        Chart rendering error
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>
                        {this.state.error?.message || 'Unknown error'}
                    </div>
                    <button
                        className="win-button"
                        onClick={() => this.setState({ hasError: false, error: null })}
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
