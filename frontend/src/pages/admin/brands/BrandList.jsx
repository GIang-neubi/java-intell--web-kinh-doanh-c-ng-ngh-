import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Tag } from 'lucide-react';
import { fetchBrands, createBrand, updateBrand, deleteBrand } from '../../../api/brands';
import { getErrorMessage, getFieldErrors } from '../../../api/client';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import BrandForm from './BrandForm';

export default function BrandList() {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [keyword, setKeyword] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formFieldErrors, setFormFieldErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await fetchBrands();
      setItems(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách thương hiệu'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!keyword.trim()) { setFiltered(items); return; }
    const kw = keyword.toLowerCase();
    setFiltered(items.filter((b) => b.name.toLowerCase().includes(kw)));
  }, [items, keyword]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const clearSearch = () => setKeyword('');

  const openAdd = () => { setEditTarget(null); setFormError(''); setFormFieldErrors({}); setFormOpen(true); };
  const openEdit = (b) => { setEditTarget(b); setFormError(''); setFormFieldErrors({}); setFormOpen(true); };

  const handleSave = async (payload) => {
    setSaving(true); setFormError(''); setFormFieldErrors({});
    try {
      if (editTarget) {
        await updateBrand(editTarget.id, payload);
        setToast(`Cập nhật thương hiệu "${payload.name}" thành công`);
        setToastType('success');
      } else {
        await createBrand(payload);
        setToast(`Thêm thương hiệu "${payload.name}" thành công`);
        setToastType('success');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormFieldErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, editTarget ? 'Cập nhật thất bại' : 'Thêm thất bại'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBrand(deleteTarget.id);
      setToast(`Đã xóa thương hiệu "${deleteTarget.name}"`);
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

  return (
    <div className="hg-admin-module hg-brands">
      {toast && (
        <div className={`alert ${toastType === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {toast}
        </div>
      )}

      <div className="hg-admin-toolbar">
        <form className="hg-admin-filters" onSubmit={(e) => e.preventDefault()}>
          <div className="hg-admin-search">
            <Search size={16} />
            <input className="form-input" placeholder="Tìm theo tên thương hiệu..."
              value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          {keyword && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}>
              Xóa tìm kiếm
            </button>
          )}
        </form>
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={15} /> Thêm thương hiệu
        </button>
      </div>

      <div className="hg-admin-meta"><span>{filtered.length} / {items.length} thương hiệu</span></div>

      {loading ? (
        <AdminLoading label="Đang tải thương hiệu..." />
      ) : error && items.length === 0 ? (
        <AdminError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <AdminEmpty icon={Tag} title="Chưa có thương hiệu nào" description='Bấm "Thêm thương hiệu" để tạo mới.' />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <AdminEmpty icon={Tag} title="Không tìm thấy thương hiệu" description={`Không có thương hiệu khớp với "${keyword}"`} />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="hg-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th style={{ minWidth: 200 }}>Thương hiệu</th>
                  <th style={{ minWidth: 250 }}>Mô tả</th>
                  <th style={{ width: 120 }}>Sản phẩm</th>
                  <th style={{ width: 110 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td className="text-muted" style={{ fontSize: '12px', fontWeight: 500 }}>{b.id}</td>
                    <td>
                      <div className="hg-brand-cell">
                        <div className="hg-brand-logo">
                          {b.logo ? (
                            <img src={b.logo} alt={b.name} onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" />
                          ) : (
                            <Tag size={18} />
                          )}
                        </div>
                        <div className="hg-brand-name">{b.name}</div>
                      </div>
                    </td>
                    <td>
                      <div className="hg-brand-desc" style={{ maxWidth: 320 }}>
                        {b.description || <span className="text-muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`hg-product-count ${(b.productCount ?? 0) > 0 ? 'has-products' : ''}`}>
                        {b.productCount ?? 0}
                      </span>
                    </td>
                    <td>
                      <div className="hg-row-actions">
                        <button
                          type="button"
                          className="action-btn edit"
                          title="Chỉnh sửa"
                          onClick={() => openEdit(b)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="action-btn delete"
                          title="Xóa"
                          onClick={() => setDeleteTarget(b)}
                          disabled={(b.productCount ?? 0) > 0}
                          aria-disabled={(b.productCount ?? 0) > 0}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <BrandForm
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
        title="Xóa thương hiệu?"
        message={deleteTarget ? `Bạn có chắc muốn xóa thương hiệu "${deleteTarget.name}"?` : ''}
        confirmLabel="Xác nhận xóa"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}