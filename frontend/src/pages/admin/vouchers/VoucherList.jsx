import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Ticket, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { fetchVouchers, createVoucher, updateVoucher, deleteVoucher, toggleVoucher } from '../../../api/vouchers';
import { getErrorMessage, getFieldErrors } from '../../../api/client';
import { formatDate, formatPrice } from '../../../utils/helpers';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import AdminPagination from '../../../components/admin/AdminPagination';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import VoucherForm from './VoucherForm';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '',      label: 'Tất cả trạng thái' },
  { value: 'true',  label: 'Đang hoạt động' },
  { value: 'false', label: 'Đã vô hiệu hóa' },
];

function isExpired(endDate) {
  return endDate && new Date(endDate) < new Date();
}

function isNotStarted(startDate) {
  return startDate && new Date(startDate) > new Date();
}

function getStatusLabel(v) {
  const expired = isExpired(v.endDate);
  const notStarted = isNotStarted(v.startDate);
  if (!v.active) return { label: 'Vô hiệu', className: 'status-cancelled' };
  if (expired) return { label: 'Hết hạn', className: 'status-cancelled' };
  if (notStarted) return { label: 'Chưa bắt đầu', className: 'status-processing' };
  return { label: 'Hoạt động', className: 'status-delivered' };
}

export default function VoucherList() {
  const [items, setItems]               = useState([]);
  const [pageNo, setPageNo]             = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [toast, setToast]               = useState('');
  const [toastType, setToastType]       = useState('success');

  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword]           = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState('');
  const [formFieldErrors, setFormFieldErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [toggling, setToggling]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await fetchVouchers({
        keyword:  keyword.trim() || undefined,
        active:   activeFilter !== '' ? activeFilter : undefined,
        pageNo,
        pageSize: PAGE_SIZE,
      });
      setItems(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách voucher'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, activeFilter, pageNo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSearch = (e) => { e.preventDefault(); setPageNo(0); setKeyword(keywordInput); };

  const clearFilters = () => {
    setKeywordInput('');
    setKeyword('');
    setActiveFilter('');
    setPageNo(0);
  };

  const hasFilters = keyword || activeFilter;

  const openAdd = () => { setEditTarget(null); setFormError(''); setFormFieldErrors({}); setFormOpen(true); };
  const openEdit = (v) => { setEditTarget(v); setFormError(''); setFormFieldErrors({}); setFormOpen(true); };

  const handleSave = async (payload) => {
    setSaving(true); setFormError(''); setFormFieldErrors({});
    try {
      if (editTarget) {
        await updateVoucher(editTarget.id, payload);
        setToast(`Cập nhật voucher "${payload.code}" thành công`);
        setToastType('success');
      } else {
        await createVoucher(payload);
        setToast(`Tạo voucher "${payload.code}" thành công`);
        setToastType('success');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormFieldErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, editTarget ? 'Cập nhật thất bại' : 'Tạo voucher thất bại'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVoucher(deleteTarget.id);
      setToast(`Đã xóa voucher "${deleteTarget.code}"`);
      setToastType('success');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setToast(getErrorMessage(err, 'Xóa thất bại'));
      setToastType('error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (v) => {
    setToggling(v.id);
    try {
      const updated = await toggleVoucher(v.id);
      setToast(updated.active ? `Đã kích hoạt "${v.code}"` : `Đã vô hiệu hóa "${v.code}"`);
      setToastType('success');
      await load();
    } catch (err) {
      setToast(getErrorMessage(err, 'Thay đổi trạng thái thất bại'));
      setToastType('error');
    } finally {
      setToggling(null);
    }
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
            <input className="form-input" placeholder="Tìm theo mã, mô tả..."
              value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} />
          </div>
          <select className="form-input" style={{ minWidth: 170 }} value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPageNo(0); }}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="submit" className="btn btn-outline btn-sm">Tìm kiếm</button>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={14} /> Xóa bộ lọc
            </button>
          )}
        </form>
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={15} /> Thêm voucher
        </button>
      </div>

      <div className="hg-admin-meta"><span>{totalElements} voucher</span></div>

      {loading ? (
        <AdminLoading label="Đang tải voucher..." />
      ) : error && items.length === 0 ? (
        <AdminError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <AdminEmpty icon={Ticket} title={hasFilters ? "Không tìm thấy voucher" : "Chưa có voucher nào"} description={hasFilters ? `Không có voucher nào khớp với "${keyword}"` : 'Bấm "Thêm voucher" để tạo mã giảm giá đầu tiên.'} />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="hg-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Mã</th>
                  <th style={{ width: 90 }}>Loại</th>
                  <th style={{ width: 100 }}>Giá trị</th>
                  <th style={{ width: 110 }}>Đơn tối thiểu</th>
                  <th style={{ width: 110 }}>Giảm tối đa</th>
                  <th style={{ width: 80 }}>Số lượng</th>
                  <th style={{ width: 80 }}>Đã dùng</th>
                  <th style={{ width: 130 }}>Bắt đầu</th>
                  <th style={{ width: 130 }}>Kết thúc</th>
                  <th style={{ width: 110 }}>Trạng thái</th>
                  <th style={{ width: 100 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => {
                  const status = getStatusLabel(v);
                  return (
                    <tr key={v.id}>
                      <td>
                        <span className="hg-voucher-code">{v.code}</span>
                      </td>
                      <td>
                        <span className={`hg-voucher-type ${v.discountType}`}>
                          {v.discountType === 'PERCENT' ? '%' : 'VNĐ'}
                        </span>
                      </td>
                      <td className="hg-voucher-value">
                        {v.discountType === 'PERCENT' ? `${v.discountValue}%` : formatPrice(v.discountValue)}
                      </td>
                      <td>
                        {v.minOrderValue > 0
                          ? formatPrice(v.minOrderValue)
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {v.maxDiscount && v.discountType === 'PERCENT'
                          ? formatPrice(v.maxDiscount)
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-center">
                        {v.quantity > 0 ? v.quantity : <span className="text-muted">∞</span>}
                      </td>
                      <td className="text-center hg-used-count">
                        {v.usedQuantity} {v.quantity > 0 && <span className="text-muted">/{v.quantity}</span>}
                      </td>
                      <td className="text-muted" style={{ fontSize: 12 }}>
                        {v.startDate ? formatDate(v.startDate) : '—'}
                      </td>
                      <td className="text-muted" style={{ fontSize: 12 }}>
                        {v.endDate ? formatDate(v.endDate) : '—'}
                      </td>
                      <td>
                        <span className={`status-badge ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="hg-row-actions">
                          <button
                            type="button"
                            className="action-btn"
                            title={v.active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            onClick={() => handleToggle(v)}
                            disabled={toggling === v.id}
                          >
                            {v.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          <button
                            type="button"
                            className="action-btn edit"
                            title="Chỉnh sửa"
                            onClick={() => openEdit(v)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="action-btn delete"
                            title="Xóa"
                            onClick={() => setDeleteTarget(v)}
                            disabled={v.usedQuantity > 0}
                            aria-disabled={v.usedQuantity > 0}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination pageNo={pageNo} totalPages={totalPages} onChange={setPageNo} />
        </div>
      )}

      {formOpen && (
        <VoucherForm
          initial={editTarget}
          saving={saving}
          error={formError}
          fieldErrors={formFieldErrors}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa voucher?"
        message={deleteTarget ? `Bạn có chắc muốn xóa voucher "${deleteTarget.code}"? Thao tác này không thể hoàn tác.` : ''}
        confirmLabel="Xác nhận xóa"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}