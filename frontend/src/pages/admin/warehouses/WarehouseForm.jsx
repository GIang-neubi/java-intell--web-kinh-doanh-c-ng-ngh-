import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Building2, Save, ArrowLeft, CheckCircle } from 'lucide-react';
import { createWarehouse, updateWarehouse, fetchWarehouseDetail } from '../../../api/warehouses';
import { getErrorMessage, getFieldErrors } from '../../../api/client';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import WarehouseMapPicker from '../../../components/map/WarehouseMapPicker';

export default function WarehouseForm({ isModal = false, initialData = null, onSuccess = null, onCancel = null }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id || initialData?.id);
  const warehouseId = id || initialData?.id;

  const [formData, setFormData] = useState({
    warehouseCode: initialData?.warehouseCode || '',
    name: initialData?.name || '',
    address: initialData?.address || '',
    latitude: initialData?.latitude ?? '',
    longitude: initialData?.longitude ?? '',
    phone: initialData?.phone || '',
    status: initialData?.status || 'ACTIVE'
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (id && !initialData) {
      setInitialLoading(true);
      fetchWarehouseDetail(id)
        .then((data) => {
          setFormData({
            warehouseCode: data.warehouseCode || '',
            name: data.name || '',
            address: data.address || '',
            latitude: data.latitude ?? '',
            longitude: data.longitude ?? '',
            phone: data.phone || '',
            status: data.status || 'ACTIVE'
          });
        })
        .catch((err) => setError(getErrorMessage(err, 'Không tải được thông tin kho hàng')))
        .finally(() => setInitialLoading(false));
    }
  }, [id, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'warehouseCode' ? value.toUpperCase() : value
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleLocationChange = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const payload = {
      warehouseCode: formData.warehouseCode.trim().toUpperCase(),
      name: formData.name.trim(),
      address: formData.address.trim(),
      latitude: formData.latitude !== '' && formData.latitude !== null ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude !== '' && formData.longitude !== null ? parseFloat(formData.longitude) : null,
      phone: formData.phone.trim() || null,
      status: formData.status
    };

    try {
      let result;
      if (isEdit) {
        result = await updateWarehouse(warehouseId, payload);
      } else {
        result = await createWarehouse(payload);
      }

      setSuccessMsg(isEdit ? 'Cập nhật kho hàng thành công!' : 'Tạo kho hàng mới thành công!');

      if (onSuccess) {
        setTimeout(() => onSuccess(result), 400);
      } else {
        setTimeout(() => navigate('/admin/warehouses'), 800);
      }
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, isEdit ? 'Lỗi khi cập nhật kho hàng' : 'Lỗi khi tạo kho hàng'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <AdminLoading message="Đang tải dữ liệu kho..." />;
  }

  return (
    <div className={isModal ? '' : 'hg-admin-module'}>
      {!isModal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link
            to="/admin/warehouses"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
          >
            <ArrowLeft size={16} /> Quay lại
          </Link>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            {isEdit ? 'Chỉnh sửa kho hàng' : 'Thêm kho hàng mới'}
          </h2>
        </div>
      )}

      {error && <AdminError message={error} />}
      {successMsg && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Mã kho <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
            </label>
            <input
              type="text"
              name="warehouseCode"
              value={formData.warehouseCode}
              onChange={handleChange}
              placeholder="VD: KHO_HN_01, KHO_HCM_CENTRAL"
              className={`form-input ${fieldErrors.warehouseCode ? 'is-invalid' : ''}`}
              required
              disabled={loading}
              style={{ textTransform: 'uppercase' }}
            />
            {fieldErrors.warehouseCode && (
              <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: 12 }}>{fieldErrors.warehouseCode}</span>
            )}
            <small style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginTop: 4 }}>
              Chỉ gồm chữ in hoa, số, gạch dưới (_) hoặc gạch ngang (-)
            </small>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Tên kho hàng <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="VD: Kho Tổng Cầu Giấy - Hà Nội"
              className={`form-input ${fieldErrors.name ? 'is-invalid' : ''}`}
              required
              disabled={loading}
            />
            {fieldErrors.name && (
              <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: 12 }}>{fieldErrors.name}</span>
            )}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Địa chỉ chi tiết <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
          </label>
          <textarea
            name="address"
            rows={2}
            value={formData.address}
            onChange={handleChange}
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố... (Ví dụ: 45 Nguyễn Trãi, Thanh Xuân, Hà Nội)"
            className={`form-input ${fieldErrors.address ? 'is-invalid' : ''}`}
            required
            disabled={loading}
          />
          {fieldErrors.address && (
            <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: 12 }}>{fieldErrors.address}</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 20 }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Số điện thoại liên hệ
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0912345678"
              className={`form-input ${fieldErrors.phone ? 'is-invalid' : ''}`}
              disabled={loading}
            />
            {fieldErrors.phone && (
              <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: 12 }}>{fieldErrors.phone}</span>
            )}
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Trạng thái hoạt động
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
              <option value="INACTIVE">INACTIVE (Tạm ngưng)</option>
            </select>
          </div>
        </div>

        {/* Bản đồ tương tác ghim vị trí kho hàng (Admin KHÔNG cần nhập tay tọa độ) */}
        <WarehouseMapPicker
          address={formData.address}
          name={formData.name}
          latitude={formData.latitude !== '' && formData.latitude !== null ? parseFloat(formData.latitude) : null}
          longitude={formData.longitude !== '' && formData.longitude !== null ? parseFloat(formData.longitude) : null}
          onLocationChange={handleLocationChange}
        />

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
              Hủy
            </button>
          ) : (
            <Link to="/admin/warehouses" className="btn btn-secondary">
              Hủy
            </Link>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Save size={16} />
            {loading ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Tạo kho hàng')}
          </button>
        </div>
      </form>
    </div>
  );
}
