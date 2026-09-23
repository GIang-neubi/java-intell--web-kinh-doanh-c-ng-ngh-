import { useState, useEffect } from 'react';
import {
  MapPin, Plus, Edit2, Trash2, Home, Building2,
  Navigation, X, Star
} from 'lucide-react';
import AccountLayout from '../layouts/AccountLayout';
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
} from '../api/addresses';
import { useToast } from '../components/Toast';

export default function SavedAddresses() {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const initialForm = {
    recipientName: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    detailAddress: '',
    addressType: 'HOME',
    isDefault: false,
  };

  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await fetchAddresses();
      setAddresses(data || []);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách địa chỉ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormData({
      ...initialForm,
      isDefault: addresses.length === 0, // Địa chỉ đầu tiên tự động default
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setFormData({
      recipientName: addr.recipientName || '',
      phone: addr.phone || '',
      province: addr.province || '',
      district: addr.district || '',
      ward: addr.ward || '',
      detailAddress: addr.detailAddress || '',
      addressType: addr.addressType || 'HOME',
      isDefault: Boolean(addr.isDefault),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.recipientName.trim()) errs.recipientName = 'Họ tên người nhận không được để trống';
    if (!formData.phone.trim()) {
      errs.phone = 'Số điện thoại không được để trống';
    } else if (!/^[0-9+ ]{9,15}$/.test(formData.phone.trim())) {
      errs.phone = 'Số điện thoại không hợp lệ (9–15 chữ số)';
    }
    if (!formData.detailAddress.trim()) errs.detailAddress = 'Địa chỉ chi tiết không được để trống';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, formData);
        showToast('Cập nhật địa chỉ thành công!', 'success');
      } else {
        await createAddress(formData);
        showToast('Thêm địa chỉ mới thành công!', 'success');
      }
      setModalOpen(false);
      loadAddresses();
    } catch (err) {
      showToast(err.message || 'Có lỗi xảy ra khi lưu địa chỉ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addr) => {
    if (addr.isDefault) return;
    try {
      await setDefaultAddress(addr.id);
      showToast(`Đã đặt địa chỉ "${addr.recipientName}" làm mặc định!`, 'success');
      loadAddresses();
    } catch (err) {
      showToast(err.message || 'Lỗi khi thiết lập mặc định', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    setDeletingId(id);
    try {
      await deleteAddress(id);
      showToast('Đã xóa địa chỉ thành công!', 'success');
      loadAddresses();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa địa chỉ', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const renderTypeIcon = (type) => {
    switch (type) {
      case 'OFFICE':
        return <Building2 size={14} />;
      case 'OTHER':
        return <Navigation size={14} />;
      default:
        return <Home size={14} />;
    }
  };

  const renderTypeLabel = (type) => {
    switch (type) {
      case 'OFFICE':
        return 'Văn phòng';
      case 'OTHER':
        return 'Khác';
      default:
        return 'Nhà riêng';
    }
  };

  return (
    <AccountLayout activeTab="addresses">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: '24px',
        paddingBottom: '18px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <MapPin size={24} style={{ color: 'var(--primary)' }} />
            <span>Sổ Địa Chỉ Nhận Hàng</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            Quản lý danh sách địa chỉ giao hàng và địa chỉ nhận hàng mặc định của bạn
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(10, 61, 143, 0.25)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
        >
          <Plus size={16} />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Đang tải sổ địa chỉ...
          </div>
        </div>
      ) : addresses.length === 0 ? (
        /* Empty state */
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px dashed var(--border)'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#eff6ff',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <MapPin size={28} />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Chưa có địa chỉ nào trong sổ lưu trữ
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 20px' }}>
            Lưu địa chỉ nhận hàng để thanh toán nhanh hơn và tự động tính toán chính xác khoảng cách giao hàng từ kho H&G.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>Thêm địa chỉ đầu tiên</span>
          </button>
        </div>
      ) : (
        /* Address cards list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              style={{
                background: '#ffffff',
                border: addr.isDefault ? '2px solid #3b82f6' : '1px solid var(--border)',
                borderRadius: '16px',
                padding: '20px 22px',
                position: 'relative',
                boxShadow: addr.isDefault ? '0 4px 20px rgba(59, 130, 246, 0.12)' : '0 1px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s'
              }}
            >
              {/* Header row: Name, Badges, & Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {addr.recipientName}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {addr.phone}
                  </span>

                  {/* Type badge */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: addr.addressType === 'OFFICE' ? '#f0fdf4' : '#f8fafc',
                    color: addr.addressType === 'OFFICE' ? '#166534' : 'var(--text-secondary)',
                    border: '1px solid var(--border)'
                  }}>
                    {renderTypeIcon(addr.addressType)}
                    <span>{renderTypeLabel(addr.addressType)}</span>
                  </span>

                  {/* Default badge */}
                  {addr.isDefault && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe'
                    }}>
                      <Star size={12} fill="#2563eb" color="#2563eb" />
                      <span>Mặc định</span>
                    </span>
                  )}
                </div>

                {/* Edit & Delete Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(addr)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                    title="Chỉnh sửa địa chỉ"
                  >
                    <Edit2 size={13} />
                    <span>Sửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    disabled={deletingId === addr.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#dc2626',
                      cursor: deletingId === addr.id ? 'not-allowed' : 'pointer'
                    }}
                    title="Xóa địa chỉ"
                  >
                    <Trash2 size={13} />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>

              {/* Address details */}
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {addr.detailAddress}
                </div>
                <div>
                  {[addr.ward, addr.district, addr.province].filter(Boolean).join(', ')}
                </div>
              </div>

              {/* Bottom footer: Set Default CTA */}
              {!addr.isDefault && (
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'flex-start'
                }}>
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#eff6ff';
                      e.currentTarget.style.borderColor = '#93c5fd';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    Thiết lập làm địa chỉ mặc định
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Thêm / Chỉnh sửa Địa chỉ ── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: 540,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '10px',
                  background: '#eff6ff', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MapPin size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {editingAddress ? 'Chỉnh sửa địa chỉ nhận hàng' : 'Thêm địa chỉ nhận hàng mới'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ padding: '24px' }}>
              {/* Row 1: Tên & SĐT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                    Họ và tên người nhận <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="Nguyễn Văn A"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    style={{ borderColor: formErrors.recipientName ? '#ef4444' : undefined }}
                  />
                  {formErrors.recipientName && (
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{formErrors.recipientName}</div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                    Số điện thoại <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="0912345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ borderColor: formErrors.phone ? '#ef4444' : undefined }}
                  />
                  {formErrors.phone && (
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{formErrors.phone}</div>
                  )}
                </div>
              </div>

              {/* Row 2: Tỉnh/Thành & Quận/Huyện */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                    Tỉnh / Thành phố
                  </label>
                  <input
                    className="form-input"
                    placeholder="Hà Nội, TP. Hồ Chí Minh..."
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                    Quận / Huyện
                  </label>
                  <input
                    className="form-input"
                    placeholder="Cầu Giấy, Quận 1..."
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 3: Phường/Xã */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                  Phường / Xã
                </label>
                <input
                  className="form-input"
                  placeholder="Dịch Vọng Hậu, Bến Nghé..."
                  value={formData.ward}
                  onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                />
              </div>

              {/* Row 4: Địa chỉ chi tiết */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                  Địa chỉ cụ thể (Số nhà, tòa nhà, tên đường) <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Số 10 Phạm Văn Bạch, Cầu Giấy..."
                  value={formData.detailAddress}
                  onChange={(e) => setFormData({ ...formData, detailAddress: e.target.value })}
                  style={{ resize: 'vertical', borderColor: formErrors.detailAddress ? '#ef4444' : undefined }}
                />
                {formErrors.detailAddress && (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{formErrors.detailAddress}</div>
                )}
              </div>

              {/* Row 5: Loại địa chỉ */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                  Loại địa chỉ
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { type: 'HOME', label: 'Nhà riêng', icon: Home },
                    { type: 'OFFICE', label: 'Văn phòng', icon: Building2 },
                    { type: 'OTHER', label: 'Khác', icon: Navigation },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, addressType: type })}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px',
                        borderRadius: '10px',
                        border: formData.addressType === type ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: formData.addressType === type ? '#eff6ff' : '#ffffff',
                        color: formData.addressType === type ? 'var(--primary)' : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 6: Đặt làm mặc định */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: '12px',
                marginBottom: '24px',
                border: '1px solid var(--border)'
              }}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="isDefault" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Đặt làm địa chỉ nhận hàng mặc định
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {saving ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu địa chỉ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
