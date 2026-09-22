import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Phone, Mail, Package, CheckCircle2, ArrowRight, RefreshCw, Users } from 'lucide-react';
import { fetchShippers } from '../../../api/delivery';
import { getErrorMessage } from '../../../api/client';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';

export default function AdminShipperList() {
  const [shippers, setShippers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchShippers();
      setShippers(data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách shipper'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalActive = shippers.reduce((sum, s) => sum + (s.activeDeliveryCount || 0), 0);
  const totalCompleted = shippers.reduce((sum, s) => sum + (s.completedDeliveryCount || 0), 0);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Đội ngũ Nhân viên Giao hàng (Shipper)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Theo dõi khối lượng phân phối thực tế và hiệu suất làm việc của từng nhân sự
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '10px',
            background: '#ffffff',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
          title="Tải lại danh sách"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Overview 3-KPI Grid */}
      <div className="hg-shipper-kpi-grid">
        <div className="hg-shipper-kpi-item">
          <div className="hg-shipper-kpi-icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Nhân sự Shipper
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
              {shippers.length} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>nhân viên</span>
            </div>
          </div>
        </div>

        <div className="hg-shipper-kpi-item">
          <div className="hg-shipper-kpi-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Đang vận chuyển
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
              {totalActive} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>kiện hàng</span>
            </div>
          </div>
        </div>

        <div className="hg-shipper-kpi-item">
          <div className="hg-shipper-kpi-icon" style={{ background: '#ecfdf5', color: '#047857' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Đã giao hoàn tất
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
              {totalCompleted} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>đơn giao</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shippers List / Cards */}
      {loading ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border)', padding: '60px 20px', textAlign: 'center' }}>
          <AdminLoading label="Đang tải danh sách nhân viên giao hàng..." />
        </div>
      ) : error ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border)', padding: '40px 20px' }}>
          <AdminError message={error} onRetry={load} />
        </div>
      ) : shippers.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border)', padding: '60px 20px' }}>
          <AdminEmpty
            title="Chưa có Shipper nào"
            description="Chưa có tài khoản nào được phân quyền ROLE_SHIPPER trong hệ thống."
          />
        </div>
      ) : (
        <div className="hg-shipper-grid">
          {shippers.map((s) => {
            const initialLetter = (s.fullName || s.username || 'S').trim().charAt(0).toUpperCase();
            return (
              <div key={s.id} className="hg-shipper-profile-card">
                {/* Header info */}
                <div className="hg-shipper-header">
                  <div className="hg-shipper-identity">
                    <div className="hg-shipper-avatar-wrap">
                      <span>{initialLetter}</span>
                      <span className={`hg-shipper-status-dot ${s.enabled ? 'active' : 'inactive'}`} />
                    </div>
                    <div>
                      <div className="hg-shipper-name">{s.fullName || s.username}</div>
                      <div className="hg-shipper-username">@{s.username}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: s.enabled ? '#ecfdf5' : '#f1f5f9',
                      color: s.enabled ? '#047857' : '#64748b',
                      border: `1px solid ${s.enabled ? '#a7f3d0' : '#e2e8f0'}`
                    }}
                  >
                    {s.enabled ? 'Hoạt động' : 'Tạm khóa'}
                  </span>
                </div>

                {/* Contact info */}
                <div className="hg-shipper-contacts">
                  <a
                    href={s.phone ? `tel:${s.phone}` : undefined}
                    className="hg-shipper-contact-row"
                    title={s.phone ? `Gọi ${s.phone}` : 'Chưa có SĐT'}
                  >
                    <Phone size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>{s.phone || 'Chưa cập nhật số điện thoại'}</span>
                  </a>
                  <a
                    href={s.email ? `mailto:${s.email}` : undefined}
                    className="hg-shipper-contact-row"
                    title={s.email ? `Gửi thư đến ${s.email}` : 'Chưa có email'}
                  >
                    <Mail size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.email || 'Chưa cập nhật email'}
                    </span>
                  </a>
                </div>

                {/* Stat pills (Active vs Done) */}
                <div className="hg-shipper-stat-pills">
                  <div className="hg-shipper-stat-box">
                    <span className="hg-shipper-stat-label">ĐANG GIAO</span>
                    <span className="hg-shipper-stat-val" style={{ color: '#0284c7' }}>
                      {s.activeDeliveryCount || 0}
                    </span>
                  </div>
                  <div className="hg-shipper-stat-box" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                    <span className="hg-shipper-stat-label">ĐÃ GIAO</span>
                    <span className="hg-shipper-stat-val" style={{ color: '#047857' }}>
                      {s.completedDeliveryCount || 0}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div>
                  <Link
                    to={`/admin/deliveries?shipperId=${s.id}`}
                    className="hg-shipper-footer-btn"
                  >
                    <span>Xem danh sách đơn phụ trách</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
