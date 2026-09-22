import { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, CheckCircle2, Phone } from 'lucide-react';
import { fetchShippers, assignShipper } from '../../../api/delivery';
import { getErrorMessage } from '../../../api/client';

export default function AssignShipperModal({ delivery, isOpen, onClose, onAssigned, onSuccess }) {
  const [shippers, setShippers] = useState([]);
  const [selectedShipperId, setSelectedShipperId] = useState('');
  const [note, setNote] = useState('');
  const [loadingShippers, setLoadingShippers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const callback = onAssigned || onSuccess;

  useEffect(() => {
    if (isOpen) {
      setError('');
      setNote('');
      setSelectedShipperId(delivery?.shipperId ? String(delivery.shipperId) : '');
      loadShippers();
    }
  }, [isOpen, delivery]);

  const loadShippers = async () => {
    setLoadingShippers(true);
    try {
      const list = await fetchShippers();
      setShippers(list || []);
      if (!delivery?.shipperId && list?.length > 0) {
        setSelectedShipperId(String(list[0].id));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách shipper'));
    } finally {
      setLoadingShippers(false);
    }
  };

  if (!isOpen || !delivery) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedShipperId) {
      setError('Vui lòng chọn một nhân viên giao hàng (Shipper)');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const updated = await assignShipper(delivery.id, {
        shipperId: Number(selectedShipperId),
        note: note.trim() || undefined,
      });
      if (callback) callback(updated);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể phân công shipper'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hg-modal-overlay" onClick={onClose}>
      <div className="hg-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="hg-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              background: '#eff6ff', color: '#1e40af',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Phân công Shipper
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Đơn hàng: <strong style={{ color: '#0a3d8f', fontFamily: 'monospace' }}>#{delivery.orderCode}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="hg-modal-close-btn"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="hg-modal-body">
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px',
                background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239',
                fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Chọn nhân viên giao hàng (Shipper) *
              </label>

              {loadingShippers ? (
                <div style={{ textAlign: 'center', padding: '30px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 8px', width: 20, height: 20 }} />
                  <span>Đang tải danh sách shipper khả dụng...</span>
                </div>
              ) : shippers.length === 0 ? (
                <div style={{ padding: '16px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontSize: '13px' }}>
                  Chưa có tài khoản nào được phân quyền ROLE_SHIPPER trong hệ thống.
                </div>
              ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                  {shippers.map((s) => {
                    const isSelected = String(s.id) === selectedShipperId;
                    const initial = (s.fullName || s.username || 'S').charAt(0).toUpperCase();

                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedShipperId(String(s.id))}
                        className={`hg-shipper-select-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '10px',
                            background: isSelected ? '#0a3d8f' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#475569',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 800, flexShrink: 0
                          }}>
                            {initial}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                {s.fullName || s.username}
                              </span>
                              {!s.enabled && (
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
                                  Bị khóa
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              SĐT: {s.phone || 'Chưa có'} · @{s.username}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 8px', borderRadius: '6px',
                            fontSize: '11px', fontWeight: 700,
                            background: isSelected ? '#dbeafe' : '#f1f5f9',
                            color: isSelected ? '#1e40af' : '#64748b'
                          }}>
                            {s.activeDeliveryCount || 0} đang giao
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Ghi chú điều phối (tùy chọn)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Giao trước 17h, hàng dễ vỡ, liên hệ người nhận trước..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', fontSize: '13px', outline: 'none',
                  color: 'var(--text-primary)', resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="hg-modal-footer">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px', borderRadius: '10px',
                background: '#ffffff', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedShipperId}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', borderRadius: '10px',
                background: '#0a3d8f', border: 'none',
                color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(10, 61, 143, 0.25)',
                opacity: (!selectedShipperId || submitting) ? 0.6 : 1
              }}
            >
              <CheckCircle2 size={15} />
              <span>{submitting ? 'Đang phân công...' : 'Xác nhận gán'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
