import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store';
import { loginRequest } from '../api/auth';
import { getErrorMessage } from '../api/client';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await loginRequest(form.username, form.password);
      login(
        {
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role,
        },
        data.token
      );
      const isAdmin = data.role === 'ROLE_ADMIN' || data.role === 'ADMIN';
      const isShipper = data.role === 'ROLE_SHIPPER' || data.role === 'SHIPPER';
      const defaultRoute = isAdmin ? '/admin' : (isShipper ? '/shipper' : '/');
      const target = location.state?.from || defaultRoute;
      navigate(target, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Sai tên đăng nhập hoặc mật khẩu.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img 
          src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
          alt="Premium Camera" 
        />
        <div style={{ position: 'absolute', bottom: 'var(--space-10)', left: 'var(--space-10)', color: '#fff', maxWidth: 400 }}>
          <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em', marginBottom: 8 }}>Bắt trọn khoảnh khắc.</div>
          <div style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.5 }}>Công nghệ cao cấp và thiết bị nhiếp ảnh cho người sáng tạo và chuyên gia.</div>
        </div>
      </div>
      
      <div className="auth-content">
        <div className="auth-card">
          
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--space-10)', transition: 'color .2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <ArrowLeft size={14} /> Quay lại cửa hàng
          </Link>

          <div className="auth-logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--text-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '16px' }}>H&G</div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>H&G Store</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase' }}>Technology & Camera</div>
              </div>
            </div>
          </div>
          
          <h1 className="auth-title">Chào mừng trở lại.</h1>
          <p className="auth-subtitle">Đăng nhập để tiếp tục mua sắm.</p>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', fontSize: '13px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Username</label>
              <input className="form-input" style={{ background: 'var(--bg-card)', padding: '14px 16px', fontSize: 15 }} placeholder="Nhập tên đăng nhập" value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
            </div>
            
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Password</label>
              <input className="form-input" style={{ background: 'var(--bg-card)', padding: '14px 16px', fontSize: 15, paddingRight: '44px' }} type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: '14px', top: '38px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-full" 
              style={{ padding: '16px', fontSize: 15, fontWeight: 700, marginTop: 'var(--space-2)', borderRadius: 'var(--radius-lg)' }} 
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
          
          <div className="auth-divider"><span>Hoặc tiếp tục với</span></div>
          
          <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Chưa có tài khoản? <Link to="/register" className="auth-link">Đăng ký ngay</Link>
          </div>
          
          <div style={{ marginTop: 'var(--space-8)', padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Tài khoản demo thử nghiệm:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setForm({ username: 'admin', password: '12345678' })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }}
              >
                <span>👑 <strong>Admin:</strong> admin / 12345678</span>
                <span style={{ color: '#0284c7', fontWeight: 600 }}>Điền nhanh</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ username: 'shipper1', password: '12345678' })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid #fed7aa', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }}
              >
                <span>🚚 <strong>Shipper 1:</strong> shipper1 / 12345678</span>
                <span style={{ color: '#ea580c', fontWeight: 600 }}>Điền nhanh</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ username: 'shipper2', password: '12345678' })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid #fed7aa', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }}
              >
                <span>🚚 <strong>Shipper 2:</strong> shipper2 / 12345678</span>
                <span style={{ color: '#ea580c', fontWeight: 600 }}>Điền nhanh</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
