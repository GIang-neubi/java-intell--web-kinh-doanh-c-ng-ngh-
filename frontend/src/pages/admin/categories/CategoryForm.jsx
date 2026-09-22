import { useEffect, useState } from 'react';
import { X, FolderTree, Loader2 } from 'lucide-react';

const EMPTY = { name: '', description: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Tên danh mục không được để trống';
  else if (form.name.trim().length > 100) errors.name = 'Tên không được vượt quá 100 ký tự';
  return errors;
}

export default function CategoryForm({ initial, saving, error, fieldErrors, onSave, onClose }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(EMPTY);
  const [localErrors, setLocalErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        description: initial.description || '',
      });
    } else {
      setForm(EMPTY);
    }
    setLocalErrors({});
    setTouched({});
  }, [initial]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const onBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setLocalErrors(errs);
      setTouched({ name: true, description: true });
      return;
    }
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || null,
    });
  };

  const allErrors = { ...localErrors, ...fieldErrors };
  const showError = (field) => Boolean(allErrors[field] && touched[field]);

  return (
    <div className="hg-modal-overlay" role="dialog" aria-modal="true">
      <div className="hg-modal" style={{ maxWidth: 480, textAlign: 'left' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: '#dbeafe', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FolderTree size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>
                {isEdit ? 'Sửa danh mục' : 'Thêm danh mục mới'}
              </div>
              {isEdit && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {initial.id}</div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ color: 'var(--text-muted)', padding: 4 }}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="cat-name">
              Tên danh mục <span className="required">*</span>
            </label>
            <input
              className={`form-input ${showError('name') ? 'error' : ''}`}
              id="cat-name"
              name="name"
              value={form.name}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="VD: Máy ảnh, Laptop, Điện thoại..."
              maxLength={100}
              autoFocus
              disabled={saving}
            />
            {showError('name') && <div className="hg-field-error">{allErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cat-desc">Mô tả</label>
            <textarea
              className={`form-input ${showError('description') ? 'error' : ''}`}
              id="cat-desc"
              name="description"
              value={form.description}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Mô tả ngắn về danh mục (tuỳ chọn)"
              rows={3}
              style={{ resize: 'vertical' }}
              disabled={saving}
            />
            {showError('description') && <div className="hg-field-error">{allErrors.description}</div>}
          </div>

          <div
            style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              paddingTop: 16, borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spinning" style={{ marginRight: 8 }} />
                  Đang lưu...
                </>
              ) : isEdit ? (
                'Cập nhật'
              ) : (
                'Thêm danh mục'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}