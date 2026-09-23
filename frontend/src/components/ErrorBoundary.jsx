import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lỗi giao diện ứng dụng (ErrorBoundary):', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg, #f8fafc)',
          padding: '24px',
          fontFamily: 'inherit'
        }}>
          <div style={{
            maxWidth: 520,
            width: '100%',
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid var(--border, #e2e8f0)',
            padding: 36,
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertTriangle size={36} />
            </div>

            <h2 style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-primary, #0f172a)',
              marginBottom: 10
            }}>
              Đã có lỗi xảy ra trên trang
            </h2>

            <p style={{
              fontSize: 14,
              color: 'var(--text-secondary, #64748b)',
              marginBottom: 24,
              lineHeight: 1.6
            }}>
              Hệ thống ghi nhận sự cố tạm thời khi tải thành phần này. Bạn vui lòng thử tải lại trang hoặc quay lại trang chủ.
            </p>

            {this.state.error?.message && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 12,
                color: '#64748b',
                fontFamily: 'monospace',
                textAlign: 'left',
                marginBottom: 24,
                overflowX: 'auto',
                wordBreak: 'break-all'
              }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: 9999,
                  background: 'var(--primary, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} /> Tải lại trang
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: 9999,
                  background: 'transparent',
                  color: 'var(--text-primary, #0f172a)',
                  border: '1px solid var(--border, #cbd5e1)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                <Home size={16} /> Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
