import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { registerRequest } from '../api/auth';
import { getErrorMessage } from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', username: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Mật khẩu không khớp.'); return; }
    if (form.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    setLoading(true); setError('');
    try {
      await registerRequest({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', textAlign: 'center', padding: 'var(--space-10)', background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
          <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Tạo tài khoản thành công!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Đang chuyển hướng đến trang đăng nhập...</p>
          <div className="spinner" style={{ margin: '24px auto 0' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img 
          src="https://images.unsplash.com/photo-1495707902641-75cac588d2e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
          alt="Premium Lenses" 
        />
        <div style={{ position: 'absolute', bottom: 'var(--space-10)', left: 'var(--space-10)', color: '#fff', maxWidth: 400 }}>
          <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em', marginBottom: 8 }}>Gia nhập cộng đồng.</div>
          <div style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.5 }}>Mở khóa ưu đãi độc quyền và quản lý thiết bị chuyên nghiệp một cách liền mạch.</div>
        </div>
      </div>
      
      <div className="auth-content">
        <div className="auth-card" style={{ maxWidth: 440 }}>
          
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
          
          <h1 className="auth-title">Tạo tài khoản.</h1>
          <p className="auth-subtitle">Tham gia để nhận ưu đãi và quyền lợi độc quyền.</p>
          
          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', fontSize: '13px', fontWeight: 500 }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Họ tên *</label>
                <input className="form-input" style={{ background: '#fff', padding: '12px 16px', fontSize: 14 }} name="fullName" value={form.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Số điện thoại (Tùy chọn)</label>
                <input className="form-input" style={{ background: '#fff', padding: '12px 16px', fontSize: 14 }} name="phone" value={form.phone} onChange={handleChange} placeholder="0912345678" />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Tên đăng nhập *</label>
              <input className="form-input" style={{ background: '#fff', padding: '12px 16px', fontSize: 14 }} name="username" value={form.username} onChange={handleChange} placeholder="Tối thiểu 3 ký tự" required minLength={3} />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Email *</label>
              <input className="form-input" style={{ background: '#fff', padding: '12px 16px', fontSize: 14 }} name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" required />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Mật khẩu *</label>
                <input className="form-input" style={{ background: '#fff', padding: '12px 16px', fontSize: 14, paddingRight: '36px' }} name="password" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={handleChange} placeholder="Tối thiểu 6 ký tự" required minLength={6} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', right: '12px', top: '34px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Xác nhận *</label>
                <input className="form-input" style={{ background: '#fff', padding: '12px 16px', fontSize: 14 }} name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Nhập lại mật khẩu" required />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-full" 
              style={{ padding: '16px', fontSize: 15, fontWeight: 700, marginTop: 'var(--space-2)', borderRadius: 'var(--radius-lg)' }} 
              disabled={loading}
            >
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>
          
          <div className="auth-divider"><span>Đã là thành viên?</span></div>
          
          <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <Link to="/login" className="auth-link">Đăng nhập ngay</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
