import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Save, Lock, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store';
import api, { getErrorMessage } from '../api/client';
import AccountLayout from '../layouts/AccountLayout';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'password' ? 'password' : 'profile';

  // ── Info form ──
  const [form, setForm]         = useState({ fullName: '', phone: '' });
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [infoError, setInfoError] = useState('');

  // ── Password form ──
  const [pwForm, setPwForm]       = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwError, setPwError]     = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showOld, setShowOld]     = useState(false);
  const [showNew, setShowNew]     = useState(false);

  // ── Load profile ──
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/users/me');
        if (data.success) {
          const u = data.data;
          setForm({ fullName: u.fullName || '', phone: u.phone || '' });
          updateUser({ ...user, fullName: u.fullName, phone: u.phone, email: u.email });
        }
      } catch { /* dùng store fallback */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!pwSuccess) return;
    const t = setTimeout(() => setPwSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [pwSuccess]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setInfoError('Họ tên không được để trống'); return; }
    setSaving(true); setInfoError('');
    try {
      const { data } = await api.put('/users/me', { fullName: form.fullName.trim(), phone: form.phone.trim() || null });
      if (data.success) {
        updateUser({ ...user, fullName: data.data.fullName, phone: data.data.phone });
        setToast('Cập nhật hồ sơ thành công!');
      }
    } catch (err) {
      setInfoError(getErrorMessage(err, 'Cập nhật thất bại. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('Mật khẩu không khớp'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    setPwSaving(true); setPwError('');
    try {
      const { data } = await api.put('/users/change-password', {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      if (data.success) {
        setPwSuccess('Đổi mật khẩu thành công!');
        setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
      }
    } catch (err) {
      setPwError(getErrorMessage(err, 'Đổi mật khẩu thất bại.'));
    } finally {
      setPwSaving(false);
    }
  };

  const FieldLabel = ({ children }) => (
    <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
      {children}
    </label>
  );
  const FormInput = (props) => (
    <input className="form-input" style={{ background: 'var(--bg-card)', padding: '12px 16px', fontSize: 14, ...props.style }} {...props} />
  );

  return (
    <AccountLayout activeTab={activeTab}>
      {activeTab === 'profile' ? (
        <>
          <div className="account-section-title">Thông tin cá nhân</div>

          {toast && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', fontSize: 13, fontWeight: 500 }}>
              <CheckCircle size={16} /> {toast}
            </div>
          )}
          {infoError && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', fontSize: 13, fontWeight: 500 }}>
              {infoError}
            </div>
          )}

          <form onSubmit={handleSaveInfo}>
            <div className="profile-form-grid">
              <div className="form-group">
                <FieldLabel>Họ tên *</FieldLabel>
                <FormInput value={form.fullName} onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Nguyễn Văn A" required />
              </div>
              <div className="form-group">
                <FieldLabel>Tên đăng nhập</FieldLabel>
                <FormInput value={user?.username || ''} disabled style={{ background: '#f9fafb', color: 'var(--text-muted)', padding: '12px 16px', fontSize: 14 }} />
              </div>
              <div className="form-group">
                <FieldLabel>Email</FieldLabel>
                <FormInput value={user?.email || ''} disabled style={{ background: '#f9fafb', color: 'var(--text-muted)', padding: '12px 16px', fontSize: 14 }} />
              </div>
              <div className="form-group">
                <FieldLabel>Số điện thoại</FieldLabel>
                <FormInput value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0912345678" />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', fontWeight: 700, borderRadius: 'var(--radius-lg)' }} disabled={saving}>
                <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="account-section-title">Đổi mật khẩu</div>

          {pwSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', fontSize: 13, fontWeight: 500 }}>
              <CheckCircle size={16} /> {pwSuccess}
            </div>
          )}
          {pwError && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', fontSize: 13, fontWeight: 500 }}>
              {pwError}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ maxWidth: 400 }}>
            <div className="form-group" style={{ position: 'relative' }}>
              <FieldLabel>Mật khẩu hiện tại</FieldLabel>
              <FormInput
                type={showOld ? 'text' : 'password'}
                value={pwForm.oldPassword}
                onChange={(e) => setPwForm(p => ({ ...p, oldPassword: e.target.value }))}
                required placeholder="Nhập mật khẩu hiện tại"
                style={{ paddingRight: 44, background: 'var(--bg-card)', padding: '12px 44px 12px 16px', fontSize: 14 }}
              />
              <button type="button" onClick={() => setShowOld(v => !v)}
                style={{ position: 'absolute', right: 14, top: 35, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <FieldLabel>Mật khẩu mới</FieldLabel>
              <FormInput
                type={showNew ? 'text' : 'password'}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                required minLength={6} placeholder="Tối thiểu 6 ký tự"
                style={{ paddingRight: 44, background: 'var(--bg-card)', padding: '12px 44px 12px 16px', fontSize: 14 }}
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                style={{ position: 'absolute', right: 14, top: 35, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="form-group">
              <FieldLabel>Xác nhận mật khẩu mới</FieldLabel>
              <FormInput
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                required placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', fontWeight: 700, borderRadius: 'var(--radius-lg)', marginTop: 'var(--space-2)' }} disabled={pwSaving}>
              <Lock size={16} /> {pwSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        </>
      )}
    </AccountLayout>
  );
}
