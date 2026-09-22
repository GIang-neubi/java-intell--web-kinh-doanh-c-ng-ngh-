import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Plus, Search, Eye, Pencil, Trash2, MapPin, Phone,
  CheckCircle, AlertCircle, RefreshCw, Map as MapIcon, Table,
  Package, ArrowDownToLine, History
} from 'lucide-react';
import { fetchWarehouses, updateWarehouseStatus, deleteWarehouse } from '../../../api/warehouses';
import { getErrorMessage } from '../../../api/client';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import AdminPagination from '../../../components/admin/AdminPagination';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import WarehouseOverviewMap from '../../../components/map/WarehouseOverviewMap';

export default function WarehouseList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Chế độ xem: 'table' (bảng) hoặc 'map' (bản đồ)
  const [viewMode, setViewMode] = useState('table');

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (p = 0) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWarehouses({ page: p, size: 20 });
      setItems(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
      setPage(data.number || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách kho'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(0);
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleToggleStatus = async (wh) => {
    const nextStatus = wh.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateWarehouseStatus(wh.id, nextStatus);
      setToast(`Đã chuyển kho ${wh.warehouseCode} sang trạng thái ${nextStatus}`);
      loadData(page);
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi cập nhật trạng thái kho'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWarehouse(deleteTarget.id);
      setToast(`Đã xóa kho "${deleteTarget.name}" thành công`);
      setDeleteTarget(null);
      loadData(page);
    } catch (err) {
      alert(getErrorMessage(err, 'Không thể xóa kho hàng này.'));
    } finally {
      setDeleting(false);
    }
  };

  // Lọc kho hàng theo từ khóa và trạng thái
  const filtered = items.filter((wh) => {
    const matchKw = !keyword.trim() ||
      wh.name.toLowerCase().includes(keyword.toLowerCase()) ||
      wh.warehouseCode.toLowerCase().includes(keyword.toLowerCase()) ||
      (wh.address && wh.address.toLowerCase().includes(keyword.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || wh.status === statusFilter;
    return matchKw && matchStatus;
  });

  const activeCount = items.filter((w) => w.status === 'ACTIVE').length;
  const inactiveCount = items.filter((w) => w.status === 'INACTIVE').length;
  const mappedCount = items.filter((w) => typeof w.latitude === 'number' && typeof w.longitude === 'number').length;

  return (
    <div className="hg-admin-module">
      {/* Toast Notification */}
      {toast && (
        <div
          className="alert alert-success"
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <CheckCircle size={18} /> {toast}
        </div>
      )}

      {/* Header & Quick Action Shortcuts */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Hệ thống kho hàng</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Quản lý các kho xuất hàng, bản đồ định vị, tồn kho và phiếu nhập kho
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link
            to="/admin/inventory"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px' }}
            title="Xem danh sách tồn kho"
          >
            <Package size={15} /> Tồn kho
          </Link>

          <Link
            to="/admin/inventory"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px' }}
            title="Tạo phiếu nhập hàng vào kho"
          >
            <ArrowDownToLine size={15} /> Nhập kho
          </Link>

          <button
            onClick={() => loadData(page)}
            className="btn btn-secondary"
            title="Làm mới"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}
          >
            <RefreshCw size={15} />
          </button>

          <Link
            to="/admin/warehouses/new"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}
          >
            <Plus size={16} /> Thêm kho mới
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng số kho</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{totalElements || items.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang hoạt động</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{activeCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tạm ngưng</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{inactiveCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã ghim bản đồ</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{mappedCount}</div>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs & Filter Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          {/* Tab Switcher: Bảng danh sách vs Bản đồ hệ thống */}
          <div style={{ display: 'inline-flex', padding: 4, background: '#f1f5f9', borderRadius: 10, border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: viewMode === 'table' ? '#fff' : 'transparent',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: viewMode === 'table' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all .2s'
              }}
            >
              <Table size={15} /> Danh sách bảng
            </button>

            <button
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: viewMode === 'map' ? '#fff' : 'transparent',
                color: viewMode === 'map' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: viewMode === 'map' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all .2s'
              }}
            >
              <MapIcon size={15} /> Bản đồ kho hàng ({mappedCount})
            </button>
          </div>

          {/* Tìm kiếm & Bộ lọc trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <input
                type="text"
                placeholder="Tìm mã, tên kho, địa chỉ..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 34, fontSize: 13 }}
              />
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Table View hoặc Map View */}
      {loading ? (
        <AdminLoading message="Đang tải dữ liệu kho hàng..." />
      ) : error ? (
        <AdminError message={error} />
      ) : filtered.length === 0 ? (
        <AdminEmpty message="Không tìm thấy kho hàng nào" />
      ) : viewMode === 'map' ? (
        /* View Bản đồ hệ thống kho hàng tương tác */
        <WarehouseOverviewMap warehouses={filtered} />
      ) : (
        /* View Bảng danh sách truyền thống */
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>MÃ KHO</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>TÊN KHO</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>ĐỊA CHỈ</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>TỌA ĐỘ BẢN ĐỒ</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>LIÊN HỆ</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((wh) => (
                  <tr key={wh.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>
                      <span style={{ padding: '3px 8px', borderRadius: 4, background: '#f1f5f9', color: '#334155' }}>
                        {wh.warehouseCode}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>
                      <Link to={`/admin/warehouses/${wh.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {wh.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {wh.address}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      {wh.latitude && wh.longitude ? (
                        <span style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          📍 {wh.latitude.toFixed(4)}, {wh.longitude.toFixed(4)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Chưa ghim</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {wh.phone || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleToggleStatus(wh)}
                        title="Click để đổi trạng thái"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full, 9999px)',
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: wh.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                            color: wh.status === 'ACTIVE' ? '#15803d' : '#b91c1c'
                          }}
                        >
                          {wh.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Link
                          to={`/admin/warehouses/${wh.id}`}
                          className="btn btn-sm btn-outline"
                          title="Xem chi tiết"
                          style={{ padding: '4px 8px' }}
                        >
                          <Eye size={15} />
                        </Link>
                        <Link
                          to={`/admin/warehouses/${wh.id}/edit`}
                          className="btn btn-sm btn-outline"
                          title="Chỉnh sửa"
                          style={{ padding: '4px 8px' }}
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(wh)}
                          className="btn btn-sm btn-outline"
                          title="Xóa kho"
                          style={{ padding: '4px 8px', color: 'var(--color-danger, #ef4444)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ padding: 16, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
              <AdminPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => loadData(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa kho hàng"
        message={`Bạn có chắc chắn muốn xóa kho "${deleteTarget?.name}" (${deleteTarget?.warehouseCode})? Hành động này không thể hoàn tác.`}
        confirmText={deleting ? 'Đang xóa...' : 'Xóa kho'}
        confirmVariant="danger"
        disabled={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
