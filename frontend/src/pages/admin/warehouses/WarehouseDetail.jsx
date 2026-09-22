import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Pencil, MapPin, Phone, Calendar, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchWarehouseDetail, updateWarehouseStatus } from '../../../api/warehouses';
import { formatDate } from '../../../utils/helpers';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';

export default function WarehouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWarehouseDetail(id);
      setWarehouse(data);
    } catch (err) {
      setError(err.message || 'Không tìm thấy kho hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!warehouse) return;
    const nextStatus = warehouse.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusLoading(true);
    try {
      const updated = await updateWarehouseStatus(warehouse.id, nextStatus);
      setWarehouse(updated);
    } catch (err) {
      alert(err.message || 'Lỗi khi đổi trạng thái kho');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <AdminLoading message="Đang tải thông tin kho..." />;
  if (error) return <AdminError message={error} />;
  if (!warehouse) return null;

  const googleMapsUrl = (warehouse.latitude && warehouse.longitude)
    ? `https://www.google.com/maps?q=${warehouse.latitude},${warehouse.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(warehouse.address)}`;

  return (
    <div className="hg-admin-module">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/admin/warehouses"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
          >
            <ArrowLeft size={16} /> Danh sách
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{warehouse.name}</h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: warehouse.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                  color: warehouse.status === 'ACTIVE' ? '#15803d' : '#b91c1c'
                }}
              >
                {warehouse.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {warehouse.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
              </span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mã kho: <strong>{warehouse.warehouseCode}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleToggleStatus}
            disabled={statusLoading}
            className={`btn ${warehouse.status === 'ACTIVE' ? 'btn-outline' : 'btn-secondary'}`}
            style={{ fontSize: 13 }}
          >
            {statusLoading ? 'Đang xử lý...' : (warehouse.status === 'ACTIVE' ? 'Tạm ngưng kho' : 'Kích hoạt kho')}
          </button>
          <Link
            to={`/admin/warehouses/${warehouse.id}/edit`}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Pencil size={15} /> Sửa thông tin
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} style={{ color: 'var(--primary, #3b82f6)' }} /> Thông tin kho
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Địa chỉ</span>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <MapPin size={16} style={{ color: 'var(--text-muted)', marginTop: 3, flexShrink: 0 }} />
                <span>{warehouse.address}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Điện thoại liên hệ</span>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                <span>{warehouse.phone || 'Chưa cập nhật'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Ngày tạo</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(warehouse.createdAt)}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Cập nhật lần cuối</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(warehouse.updatedAt || warehouse.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} style={{ color: 'var(--primary, #3b82f6)' }} /> Tọa độ GPS & Vị trí bản đồ
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--surface-subtle, #f8fafc)', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vĩ độ (Lat)</span>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{warehouse.latitude ?? '—'}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-subtle, #f8fafc)', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kinh độ (Lng)</span>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{warehouse.longitude ?? '—'}</div>
              </div>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontSize: 13 }}
            >
              <ExternalLink size={15} /> Mở trên Google Maps
            </a>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              * Tọa độ được sử dụng bởi hệ thống để tính khoảng cách giao hàng (Haversine) từ kho đến địa chỉ của khách hàng và tính cước phí vận chuyển.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
