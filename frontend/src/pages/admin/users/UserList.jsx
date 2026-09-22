import { useCallback, useEffect, useState } from 'react';
import { Search, Users, Lock, Unlock, ShieldCheck, ShieldOff, Eye, X } from 'lucide-react';
import { fetchAdminUsers, toggleUserStatus, updateUserRole } from '../../../api/users';
import { getErrorMessage } from '../../../api/client';
import { formatDate } from '../../../utils/helpers';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import AdminPagination from '../../../components/admin/AdminPagination';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';

const PAGE_SIZE = 10;

const ROLE_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'ROLE_USER', label: 'Khách hàng' },
  { value: 'ROLE_ADMIN', label: 'Quản trị viên' },
];

const ROLE_LABEL = { ROLE_USER: 'Khách hàng', ROLE_ADMIN: 'Quản trị viên' };
const ROLE_STYLE = {
  ROLE_ADMIN: { background: '#fef3c7', color: '#92400e' },
  ROLE_USER:  { background: '#eff6ff', color: '#1e40af' },
};

export default function UserList() {
  const [items, setItems] = useState([]);
  const [pageNo, setPageNo] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [statusTarget, setStatusTarget] = useState(null);
  const [roleTarget, setRoleTarget] = useState(null);
  const [actioning, setActioning] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminUsers({
        keyword:  keyword.trim() || undefined,
        role:     roleFilter    || undefined,
        pageNo,
        pageSize: PAGE_SIZE,
      });
      setItems(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách người dùng'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, roleFilter, pageNo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPageNo(0);
    setKeyword(keywordInput);
  };

  const clearFilters = () => {
    setKeywordInput('');
    setKeyword('');
    setRoleFilter('');
    setPageNo(0);
  };

  const hasFilters = keyword || roleFilter;

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setActioning(true);
    try {
      const updated = await toggleUserStatus(statusTarget.id);
      setToast(
        updated.enabled
          ? `Đã mở khóa tài khoản "${statusTarget.username}"`
          : `Đã khóa tài khoản "${statusTarget.username}"`
      );
      setToastType('success');
      setStatusTarget(null);
      await load();
    } catch (err) {
      setToast(getErrorMessage(err, 'Thay đổi trạng thái thất bại'));
      setToastType('error');
      setStatusTarget(null);
    } finally {
      setActioning(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleTarget) return;
    setActioning(true);
    try {
      await updateUserRole(roleTarget.user.id, roleTarget.newRole);
      setToast(
        `Đã đổi quyền "${roleTarget.user.username}" sang ${ROLE_LABEL[roleTarget.newRole]}`
      );
      setToastType('success');
      setRoleTarget(null);
      await load();
    } catch (err) {
      setToast(getErrorMessage(err, 'Thay đổi quyền thất bại'));
      setToastType('error');
      setRoleTarget(null);
    } finally {
      setActioning(false);
    }
  };

  const openRoleToggle = (user) => {
    const newRole = user.role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';
    setRoleTarget({ user, newRole });
  };

  const openView = (user) => {
    setViewTarget(user);
  };

  return (
    <div className="hg-admin-module">
      {toast && (
        <div className={`alert ${toastType === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {toast}
        </div>
      )}

      <div className="hg-admin-toolbar">
        <form className="hg-admin-filters" onSubmit={handleSearch}>
          <div className="hg-admin-search">
            <Search size={16} />
            <input
              className="form-input"
              placeholder="Tìm theo tên, email, username..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
            />
          </div>
          <select
            className="form-input"
            style={{ minWidth: 160 }}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPageNo(0); }}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-outline btn-sm">Tìm kiếm</button>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={14} /> Xóa bộ lọc
            </button>
          )}
        </form>
      </div>

      <div className="hg-admin-meta">
        <span>{totalElements} người dùng</span>
      </div>

      {loading ? (
        <AdminLoading label="Đang tải danh sách người dùng..." />
      ) : error && items.length === 0 ? (
        <AdminError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <AdminEmpty
            icon={Users}
            title="Không tìm thấy người dùng"
            description="Thử thay đổi từ khóa hoặc bộ lọc"
          />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="hg-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Người dùng</th>
                  <th style={{ minWidth: 180 }}>Email</th>
                  <th style={{ minWidth: 130 }}>Số điện thoại</th>
                  <th style={{ width: 120 }}>Vai trò</th>
                  <th style={{ width: 110 }}>Trạng thái</th>
                  <th style={{ width: 140 }}>Ngày đăng ký</th>
                  <th style={{ width: 150 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="hg-user-cell">
                        <div className={`hg-user-avatar ${u.role === 'ROLE_ADMIN' ? 'admin' : 'user'}`}>
                          {(u.fullName || u.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="hg-user-name">{u.fullName || u.username}</div>
                          <div className="hg-user-username">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {u.phone || <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={ROLE_STYLE[u.role] || {}}
                      >
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${u.enabled ? 'status-delivered' : 'status-cancelled'}`}
                      >
                        {u.enabled ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {u.createdAt ? formatDate(u.createdAt) : '—'}
                    </td>
                    <td>
                      <div className="hg-row-actions">
                        <button
                          type="button"
                          className="action-btn view"
                          title="Xem chi tiết"
                          onClick={() => openView(u)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${u.enabled ? 'btn-danger' : 'btn-outline'}`}
                          title={u.enabled ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          onClick={() => setStatusTarget(u)}
                          disabled={actioning}
                        >
                          {u.enabled ? <Lock size={13} /> : <Unlock size={13} />}
                          {u.enabled ? 'Khóa' : 'Mở khóa'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          title={
                            u.role === 'ROLE_ADMIN'
                              ? 'Hạ xuống Khách hàng'
                              : 'Nâng lên Quản trị viên'
                          }
                          onClick={() => openRoleToggle(u)}
                          disabled={actioning}
                        >
                          {u.role === 'ROLE_ADMIN'
                            ? <><ShieldOff size={13} /> Hạ quyền</>
                            : <><ShieldCheck size={13} /> Nâng quyền</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination pageNo={pageNo} totalPages={totalPages} onChange={setPageNo} />
        </div>
      )}

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.enabled ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
        message={statusTarget
          ? statusTarget.enabled
            ? `Bạn có chắc muốn khóa tài khoản "${statusTarget.username}"? Người dùng sẽ không thể đăng nhập.`
            : `Bạn có chắc muốn mở khóa tài khoản "${statusTarget.username}"?`
          : ''}
        confirmLabel={statusTarget?.enabled ? 'Khóa' : 'Mở khóa'}
        loading={actioning}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleToggleStatus}
      />

      <ConfirmDialog
        open={!!roleTarget}
        title={
          roleTarget?.newRole === 'ROLE_ADMIN'
            ? 'Nâng lên Quản trị viên?'
            : 'Hạ xuống Khách hàng?'
        }
        message={roleTarget
          ? roleTarget.newRole === 'ROLE_ADMIN'
            ? `Bạn có chắc muốn cấp quyền Quản trị viên cho "${roleTarget.user.username}"? Người dùng này sẽ có toàn quyền admin.`
            : `Bạn có chắc muốn hạ quyền "${roleTarget.user.username}" xuống Khách hàng?`
          : ''}
        confirmLabel="Xác nhận"
        loading={actioning}
        onCancel={() => setRoleTarget(null)}
        onConfirm={handleUpdateRole}
      />

      {viewTarget && (
        <div className="hg-modal-overlay" role="dialog" aria-modal="true" onClick={() => setViewTarget(null)}>
          <div className="hg-modal" style={{ maxWidth: 500, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: viewTarget.role === 'ROLE_ADMIN' ? '#fef3c7' : '#dbeafe',
                    color: viewTarget.role === 'ROLE_ADMIN' ? '#92400e' : 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 18,
                  }}
                >
                  {(viewTarget.fullName || viewTarget.username || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>Chi tiết người dùng</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {viewTarget.id}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                style={{ color: 'var(--text-muted)', padding: 4 }}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="hg-user-detail-grid">
              <div className="hg-detail-row">
                <span className="hg-detail-label">Họ tên</span>
                <span className="hg-detail-value">{viewTarget.fullName || '—'}</span>
              </div>
              <div className="hg-detail-row">
                <span className="hg-detail-label">Username</span>
                <span className="hg-detail-value">@{viewTarget.username}</span>
              </div>
              <div className="hg-detail-row">
                <span className="hg-detail-label">Email</span>
                <span className="hg-detail-value">{viewTarget.email}</span>
              </div>
              <div className="hg-detail-row">
                <span className="hg-detail-label">Số điện thoại</span>
                <span className="hg-detail-value">{viewTarget.phone || '—'}</span>
              </div>
              <div className="hg-detail-row">
                <span className="hg-detail-label">Vai trò</span>
                <span className="hg-detail-value">
                  <span
                    className="status-badge"
                    style={ROLE_STYLE[viewTarget.role] || {}}
                  >
                    {ROLE_LABEL[viewTarget.role] || viewTarget.role}
                  </span>
                </span>
              </div>
              <div className="hg-detail-row">
                <span className="hg-detail-label">Trạng thái</span>
                <span className="hg-detail-value">
                  <span
                    className={`status-badge ${viewTarget.enabled ? 'status-delivered' : 'status-cancelled'}`}
                  >
                    {viewTarget.enabled ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                </span>
              </div>
              <div className="hg-detail-row">
                <span className="hg-detail-label">Ngày đăng ký</span>
                <span className="hg-detail-value">
                  {viewTarget.createdAt ? formatDate(viewTarget.createdAt) : '—'}
                </span>
              </div>
              <div className="hg-detail-row">
                <span className="hg-detail-label">Cập nhật lần cuối</span>
                <span className="hg-detail-value">
                  {viewTarget.updatedAt ? formatDate(viewTarget.updatedAt) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}