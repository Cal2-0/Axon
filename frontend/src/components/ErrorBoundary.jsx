import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("AXON Error Boundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
          padding: '40px', 
          margin: '20px', 
          backgroundColor: '#1e1e24', 
          borderLeft: '4px solid #ef4444',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h2 style={{color: '#ef4444', marginTop: 0}}>Something went wrong in the Forensic Dashboard</h2>
          <p>The application encountered an unexpected error while rendering this component.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px', padding: '15px', backgroundColor: '#131317', borderRadius: '4px', fontSize: '12px' }}>
            <summary style={{cursor: 'pointer', color: '#9ca3af'}}>View Technical Details</summary>
            <br />
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
