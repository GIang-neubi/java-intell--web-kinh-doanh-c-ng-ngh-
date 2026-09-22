import { useEffect, useState } from 'react';
import { X, Tag, Loader2 } from 'lucide-react';

const EMPTY = { name: '', description: '', logo: '' };

function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = 'Tên thương hiệu không được để trống';
  else if (form.name.trim().length > 100) e.name = 'Tên không được vượt quá 100 ký tự';
  if (form.logo && form.logo.trim() && !/^https?:\/\/.+/i.test(form.logo.trim())) {
    e.logo = 'Logo phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)';
  }
  return e;
}

export default function BrandForm({ initial, saving, error, fieldErrors, onSave, onClose }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(EMPTY);
  const [localErrors, setLocalErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({ name: initial.name || '', description: initial.description || '', logo: initial.logo || '' });
      if (initial.logo) setLogoPreview(initial.logo);
    } else {
      setForm(EMPTY);
      setLogoPreview('');
    }
    setLocalErrors({});
    setTouched({});
    setLogoError('');
  }, [initial]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setLocalErrors((p) => ({ ...p, [name]: undefined }));
    if (name === 'logo') {
      setLogoPreview(value);
      setLogoError('');
    }
  };

  const onBlur = (e) => {
    setTouched((p) => ({ ...p, [e.target.name]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setLocalErrors(errs);
      setTouched({ name: true, description: true, logo: true });
      return;
    }
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || null,
      logo: form.logo.trim() || null,
    });
  };

  const allErrors = { ...localErrors, ...fieldErrors };
  const showError = (field) => Boolean(allErrors[field] && touched[field]);

  return (
    <div className="hg-modal-overlay" role="dialog" aria-modal="true">
      <div
        className="hg-modal"
        style={{ maxWidth: 500, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{isEdit ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'}</div>
              {isEdit && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {initial.id}</div>}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} style={{ color: 'var(--text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="brand-name">
              Tên thương hiệu <span className="required">*</span>
            </label>
            <input
              className={`form-input ${showError('name') ? 'error' : ''}`}
              id="brand-name"
              name="name"
              value={form.name}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="VD: Canon, Sony, Apple..."
              maxLength={100}
              autoFocus
              disabled={saving}
            />
            {showError('name') && <div className="hg-field-error">{allErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="brand-desc">Mô tả</label>
            <textarea
              className="form-input"
              id="brand-desc"
              name="description"
              value={form.description}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Mô tả ngắn về thương hiệu"
              rows={3}
              style={{ resize: 'vertical' }}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="brand-logo">Logo (URL)</label>
            <input
              className={`form-input ${showError('logo') || logoError ? 'error' : ''}`}
              id="brand-logo"
              name="logo"
              type="url"
              value={form.logo}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="https://example.com/logo.png (tuỳ chọn)"
              disabled={saving}
            />
            {logoPreview && (
              <div className="hg-logo-preview">
                <img src={logoPreview} alt="Logo preview" onError={() => { setLogoError('Không tải được ảnh logo'); setLogoPreview(''); }} />
                {logoError && <span className="hg-logo-error">{logoError}</span>}
              </div>
            )}
            {showError('logo') && <div className="hg-field-error">{allErrors.logo}</div>}
            {logoError && <div className="hg-field-error">{logoError}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spinning" style={{ marginRight: 8 }} />
                  Đang lưu...
                </>
              ) : isEdit ? (
                'Cập nhật'
              ) : (
                'Thêm thương hiệu'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}