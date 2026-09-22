import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save, Lock, CheckCircle2, ShieldCheck, User, Mail, Phone, KeyRound, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store';
import api, { getErrorMessage } from '../../api/client';

export default function AdminProfile() {
  const { user, updateUser } = useAuthStore();

  // ── Info form ──
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoToast, setInfoToast] = useState('');
  const [infoError, setInfoError] = useState('');

  // ── Password form ──
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwToast, setPwToast] = useState('');
  const [pwError, setPwError] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/users/me');
        if (data.success && data.data) {
          const u = data.data;
          setForm({ fullName: u.fullName || '', phone: u.phone || '' });
          updateUser({ ...user, fullName: u.fullName, phone: u.phone, email: u.email });
        }
      } catch {
        if (user) {
          setForm({ fullName: user.fullName || '', phone: user.phone || '' });
        }
      }
    })();
  }, []);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setInfoError('Họ và tên không được để trống');
      return;
    }
    setSavingInfo(true);
    setInfoError('');
    setInfoToast('');
    try {
      const { data } = await api.put('/users/me', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
      });
      if (data.success) {
        updateUser({ ...user, fullName: data.data.fullName, phone: data.data.phone });
        setInfoToast('Cập nhật thông tin quản trị viên thành công!');
        setTimeout(() => setInfoToast(''), 4000);
      }
    } catch (err) {
      setInfoError(getErrorMessage(err, 'Cập nhật thông tin thất bại'));
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setSavingPw(true);
    setPwError('');
    setPwToast('');
    try {
      const { data } = await api.put('/users/change-password', {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      if (data.success) {
        setPwToast('Đổi mật khẩu thành công!');
        setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
        setTimeout(() => setPwToast(''), 4000);
      }
    } catch (err) {
      setPwError(getErrorMessage(err, 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.'));
    } finally {
      setSavingPw(false);
    }
  };

  const initialLetter = (user?.fullName || user?.username || 'A').trim().charAt(0).toUpperCase();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Cài đặt Tài khoản Quản trị
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Quản lý thông tin cá nhân và bảo mật thông tin đăng nhập của bạn
        </p>
      </div>

      {/* Admin Identity Hero Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)'
          }}>
            {initialLetter}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {user?.fullName || user?.username || 'Admin'}
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 10px',
                borderRadius: '999px',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontSize: '11px',
                fontWeight: 700
              }}>
                <ShieldCheck size={13} />
                <span>Quản trị viên (ADMIN)</span>
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              @{user?.username} · {user?.email || 'admin@hg.com'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Profile Info Form */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <User size={18} style={{ color: '#0a3d8f' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Thông tin cơ bản
            </h2>
          </div>

          {infoToast && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px',
              background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46',
              fontSize: '13px', fontWeight: 600, marginBottom: '16px'
            }}>
              <CheckCircle2 size={16} />
              <span>{infoToast}</span>
            </div>
          )}

          {infoError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px',
              background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239',
              fontSize: '13px', fontWeight: 600, marginBottom: '16px'
            }}>
              <AlertCircle size={16} />
              <span>{infoError}</span>
            </div>
          )}

          <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Họ và tên *
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Nhập họ và tên..."
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: '#ffffff',
                  fontSize: '13px', outline: 'none', color: 'var(--text-primary)'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Tên đăng nhập (Username)
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: '#f8fafc',
                  fontSize: '13px', color: 'var(--text-muted)', cursor: 'not-allowed'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Địa chỉ Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: '#f8fafc',
                  fontSize: '13px', color: 'var(--text-muted)', cursor: 'not-allowed'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Số điện thoại liên hệ
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="0912345678"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: '#ffffff',
                  fontSize: '13px', outline: 'none', color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={savingInfo}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '11px 20px', borderRadius: '10px',
                  background: '#0a3d8f', color: '#ffffff', border: 'none',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(10, 61, 143, 0.25)'
                }}
              >
                <Save size={15} />
                <span>{savingInfo ? 'Đang lưu...' : 'Lưu thông tin'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Password Change Form */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <KeyRound size={18} style={{ color: '#0a3d8f' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Đổi mật khẩu bảo mật
            </h2>
          </div>

          {pwToast && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px',
              background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46',
              fontSize: '13px', fontWeight: 600, marginBottom: '16px'
            }}>
              <CheckCircle2 size={16} />
              <span>{pwToast}</span>
            </div>
          )}

          {pwError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px',
              background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239',
              fontSize: '13px', fontWeight: 600, marginBottom: '16px'
            }}>
              <AlertCircle size={16} />
              <span>{pwError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Mật khẩu hiện tại *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showOld ? 'text' : 'password'}
                  value={pwForm.oldPassword}
                  onChange={(e) => setPwForm(p => ({ ...p, oldPassword: e.target.value }))}
                  placeholder="Nhập mật khẩu hiện tại..."
                  style={{
                    width: '100%', padding: '11px 40px 11px 14px', borderRadius: '10px',
                    border: '1px solid var(--border)', background: '#ffffff',
                    fontSize: '13px', outline: 'none', color: 'var(--text-primary)'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Mật khẩu mới * (ít nhất 6 ký tự)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Nhập mật khẩu mới..."
                  style={{
                    width: '100%', padding: '11px 40px 11px 14px', borderRadius: '10px',
                    border: '1px solid var(--border)', background: '#ffffff',
                    fontSize: '13px', outline: 'none', color: 'var(--text-primary)'
                  }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Xác nhận mật khẩu mới *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Nhập lại mật khẩu mới..."
                  style={{
                    width: '100%', padding: '11px 40px 11px 14px', borderRadius: '10px',
                    border: '1px solid var(--border)', background: '#ffffff',
                    fontSize: '13px', outline: 'none', color: 'var(--text-primary)'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={savingPw}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '11px 20px', borderRadius: '10px',
                  background: '#0a3d8f', color: '#ffffff', border: 'none',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(10, 61, 143, 0.25)'
                }}
              >
                <Lock size={15} />
                <span>{savingPw ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
