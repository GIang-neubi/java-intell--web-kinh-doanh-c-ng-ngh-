import { useEffect, useState } from 'react';
import { X, Ticket, Loader2 } from 'lucide-react';

const EMPTY = {
  code: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  minOrderValue: '0',
  maxDiscount: '',
  quantity: '0',
  startDate: '',
  endDate: '',
  active: true,
};

function toInputDate(iso) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function validate(form) {
  const e = {};
  if (!form.code.trim()) e.code = 'Mã voucher không được để trống';
  else if (form.code.trim().length < 3) e.code = 'Mã voucher tối thiểu 3 ký tự';
  else if (!/^[A-Z0-9_-]+$/.test(form.code.trim().toUpperCase())) {
    e.code = 'Mã chỉ chứa chữ cái, số, gạch ngang và gạch dưới';
  }
  if (!form.discountType) e.discountType = 'Chọn loại giảm giá';
  if (form.discountValue === '' || Number(form.discountValue) <= 0)
    e.discountValue = 'Giá trị giảm phải > 0';
  if (form.discountType === 'PERCENT' && Number(form.discountValue) > 100)
    e.discountValue = 'Phần trăm không được vượt quá 100';
  if (form.minOrderValue !== '' && Number(form.minOrderValue) < 0)
    e.minOrderValue = 'Giá trị đơn tối thiểu không được âm';
  if (form.maxDiscount !== '' && Number(form.maxDiscount) < 0)
    e.maxDiscount = 'Giảm tối đa không được âm';
  if (form.quantity !== '' && (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0))
    e.quantity = 'Số lượng phải là số nguyên >= 0';
  if (!form.startDate) e.startDate = 'Chọn ngày bắt đầu';
  if (!form.endDate) e.endDate = 'Chọn ngày kết thúc';
  if (form.startDate && form.endDate && form.startDate >= form.endDate)
    e.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
  return e;
}

export default function VoucherForm({ initial, saving, error, fieldErrors, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(EMPTY);
  const [localErrors, setLocalErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        code:          initial.code          || '',
        description:   initial.description   || '',
        discountType:  initial.discountType  || 'PERCENT',
        discountValue: initial.discountValue != null ? String(initial.discountValue) : '',
        minOrderValue: initial.minOrderValue != null ? String(initial.minOrderValue) : '0',
        maxDiscount:   initial.maxDiscount   != null ? String(initial.maxDiscount)   : '',
        quantity:      initial.quantity      != null ? String(initial.quantity)       : '0',
        startDate:     toInputDate(initial.startDate),
        endDate:       toInputDate(initial.endDate),
        active:        initial.active != null ? initial.active : true,
      });
    } else {
      setForm(EMPTY);
    }
    setLocalErrors({});
    setTouched({});
  }, [initial]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    setLocalErrors((p) => ({ ...p, [name]: undefined }));
  };

  const onBlur = (e) => {
    setTouched((p) => ({ ...p, [e.target.name]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setLocalErrors(errs);
      setTouched({ code: true, discountType: true, discountValue: true, startDate: true, endDate: true, minOrderValue: true, maxDiscount: true, quantity: true });
      return;
    }

    onSave({
      code:          form.code.trim().toUpperCase(),
      description:   form.description.trim() || null,
      discountType:  form.discountType,
      discountValue: Number(form.discountValue),
      minOrderValue: form.minOrderValue !== '' ? Number(form.minOrderValue) : 0,
      maxDiscount:   form.maxDiscount !== '' ? Number(form.maxDiscount) : null,
      quantity:      form.quantity !== '' ? Number(form.quantity) : 0,
      startDate:     form.startDate ? form.startDate + ':00' : null,
      endDate:       form.endDate   ? form.endDate   + ':00' : null,
      active:        form.active,
    });
  };

  const allErrors = { ...localErrors, ...fieldErrors };
  const showError = (field) => Boolean(allErrors[field] && touched[field]);

  const discountTypeLabel = form.discountType === 'PERCENT' ? '%' : 'VNĐ';
  const step = form.discountType === 'PERCENT' ? '1' : '1000';
  const max = form.discountType === 'PERCENT' ? '100' : undefined;

  return (
    <div className="hg-modal-overlay" role="dialog" aria-modal="true">
      <div
        className="hg-modal"
        style={{ maxWidth: 560, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{isEdit ? 'Sửa mã giảm giá' : 'Thêm mã giảm giá'}</div>
              {isEdit && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {initial.id}</div>}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} style={{ color: 'var(--text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="voucher-code">
                Mã voucher <span className="required">*</span>
              </label>
              <input
                className={`form-input ${showError('code') ? 'error' : ''}`}
                id="voucher-code"
                name="code"
                value={form.code}
                onChange={onChange}
                onBlur={onBlur}
                placeholder="VD: SALE20"
                style={{ textTransform: 'uppercase' }}
                maxLength={50}
                autoFocus
                disabled={saving}
              />
              {showError('code') && <div className="hg-field-error">{allErrors.code}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <label className="hg-checkbox" style={{ marginTop: 10 }}>
                <input type="checkbox" name="active" checked={form.active} onChange={onChange} disabled={saving} />
                Kích hoạt
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="voucher-desc">Mô tả</label>
            <input
              className="form-input"
              id="voucher-desc"
              name="description"
              value={form.description}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="VD: Giảm 20% cho đơn hàng đầu tiên"
              disabled={saving}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="voucher-type">
                Loại giảm giá <span className="required">*</span>
              </label>
              <select
                className={`form-input ${showError('discountType') ? 'error' : ''}`}
                id="voucher-type"
                name="discountType"
                value={form.discountType}
                onChange={onChange}
                onBlur={onBlur}
                disabled={saving}
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định (VNĐ)</option>
              </select>
              {showError('discountType') && <div className="hg-field-error">{allErrors.discountType}</div>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="voucher-value">
                Giá trị giảm <span className="required">*</span>
                <span className="hg-input-unit">({discountTypeLabel})</span>
              </label>
              <input
                className={`form-input ${showError('discountValue') ? 'error' : ''}`}
                id="voucher-value"
                type="number"
                name="discountValue"
                value={form.discountValue}
                onChange={onChange}
                onBlur={onBlur}
                min="0.01"
                max={max}
                step={step}
                placeholder={form.discountType === 'PERCENT' ? 'VD: 20' : 'VD: 50000'}
                disabled={saving}
              />
              {showError('discountValue') && <div className="hg-field-error">{allErrors.discountValue}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="voucher-min-order">Đơn tối thiểu (VNĐ)</label>
              <input
                className={`form-input ${showError('minOrderValue') ? 'error' : ''}`}
                id="voucher-min-order"
                type="number"
                name="minOrderValue"
                value={form.minOrderValue}
                onChange={onChange}
                onBlur={onBlur}
                min="0"
                step="1000"
                placeholder="0 = không giới hạn"
                disabled={saving}
              />
              {showError('minOrderValue') && <div className="hg-field-error">{allErrors.minOrderValue}</div>}
            </div>
            {form.discountType === 'PERCENT' && (
              <div className="form-group">
                <label className="form-label" htmlFor="voucher-max-discount">Giảm tối đa (VNĐ)</label>
                <input
                  className={`form-input ${showError('maxDiscount') ? 'error' : ''}`}
                  id="voucher-max-discount"
                  type="number"
                  name="maxDiscount"
                  value={form.maxDiscount}
                  onChange={onChange}
                  onBlur={onBlur}
                  min="0"
                  step="1000"
                  placeholder="Để trống = không giới hạn"
                  disabled={saving}
                />
                {showError('maxDiscount') && <div className="hg-field-error">{allErrors.maxDiscount}</div>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="voucher-quantity">Số lượt sử dụng</label>
              <input
                className={`form-input ${showError('quantity') ? 'error' : ''}`}
                id="voucher-quantity"
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={onChange}
                onBlur={onBlur}
                min="0"
                step="1"
                placeholder="0 = không giới hạn"
                disabled={saving}
              />
              {showError('quantity') && <div className="hg-field-error">{allErrors.quantity}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="voucher-start">
                Ngày bắt đầu <span className="required">*</span>
              </label>
              <input
                className={`form-input ${showError('startDate') ? 'error' : ''}`}
                id="voucher-start"
                type="datetime-local"
                name="startDate"
                value={form.startDate}
                onChange={onChange}
                onBlur={onBlur}
                disabled={saving}
              />
              {showError('startDate') && <div className="hg-field-error">{allErrors.startDate}</div>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="voucher-end">
                Ngày kết thúc <span className="required">*</span>
              </label>
              <input
                className={`form-input ${showError('endDate') ? 'error' : ''}`}
                id="voucher-end"
                type="datetime-local"
                name="endDate"
                value={form.endDate}
                onChange={onChange}
                onBlur={onBlur}
                disabled={saving}
              />
              {showError('endDate') && <div className="hg-field-error">{allErrors.endDate}</div>}
            </div>
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
                'Tạo voucher'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}