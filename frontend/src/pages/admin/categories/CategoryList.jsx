import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, FolderTree, X } from 'lucide-react';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../../api/categories';
import { getErrorMessage, getFieldErrors } from '../../../api/client';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import CategoryForm from './CategoryForm';

export default function CategoryList() {
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
  const [fieldErrors, setFieldErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCategories();
      setItems(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách danh mục'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!keyword.trim()) {
      setFiltered(items);
    } else {
      const kw = keyword.toLowerCase();
      setFiltered(items.filter((c) => c.name.toLowerCase().includes(kw)));
    }
  }, [items, keyword]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const openAdd = () => {
    setEditTarget(null);
    setFormError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (cat) => {
    setEditTarget(cat);
    setFormError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      if (editTarget) {
        await updateCategory(editTarget.id, payload);
        setToast(`Cập nhật danh mục "${payload.name}" thành công`);
        setToastType('success');
      } else {
        await createCategory(payload);
        setToast(`Thêm danh mục "${payload.name}" thành công`);
        setToastType('success');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, editTarget ? 'Cập nhật thất bại' : 'Thêm danh mục thất bại'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      setToast(`Đã xóa danh mục "${deleteTarget.name}"`);
      setToastType('success');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setToast(getErrorMessage(err, 'Xóa danh mục thất bại'));
      setToastType('error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const clearSearch = () => setKeyword('');

  return (
    <div className="hg-admin-module">
      {toast && (
        <div className={`alert ${toastType === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {toast}
        </div>
      )}

      <div className="hg-admin-toolbar">
        <form className="hg-admin-filters" onSubmit={(e) => e.preventDefault()}>
          <div className="hg-admin-search">
            <Search size={16} />
            <input
              className="form-input"
              placeholder="Tìm theo tên danh mục..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          {keyword && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}>
              <X size={14} /> Xóa tìm kiếm
            </button>
          )}
        </form>
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={15} /> Thêm danh mục
        </button>
      </div>

      <div className="hg-admin-meta">
        <span>{filtered.length} / {items.length} danh mục</span>
      </div>

      {loading ? (
        <AdminLoading label="Đang tải danh mục..." />
      ) : error ? (
        <AdminError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <AdminEmpty
            icon={FolderTree}
            title="Chưa có danh mục nào"
            description="Bấm «Thêm danh mục» để tạo danh mục đầu tiên."
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <AdminEmpty
            icon={FolderTree}
            title="Không tìm thấy danh mục"
            description={`Không có danh mục nào khớp với "${keyword}"`}
          />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="hg-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th style={{ minWidth: 200 }}>Danh mục</th>
                  <th style={{ minWidth: 250 }}>Mô tả</th>
                  <th style={{ width: 130 }}>Sản phẩm</th>
                  <th style={{ width: 110 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr key={cat.id}>
                    <td className="text-muted" style={{ fontSize: '12px', fontWeight: 500 }}>
                      {cat.id}
                    </td>
                    <td>
                      <div className="hg-category-cell">
                        <div className="hg-category-icon">
                          <FolderTree size={16} />
                        </div>
                        <div>
                          <div className="hg-category-name">{cat.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="hg-category-desc" style={{ maxWidth: 320 }}>
                        {cat.description || <span className="text-muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`hg-product-count ${cat.productCount > 0 ? 'has-products' : ''}`}>
                        {cat.productCount ?? 0}
                      </span>
                    </td>
                    <td>
                      <div className="hg-row-actions">
                        <button
                          type="button"
                          className="action-btn edit"
                          title="Chỉnh sửa"
                          onClick={() => openEdit(cat)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="action-btn delete"
                          title="Xóa"
                          onClick={() => setDeleteTarget(cat)}
                          disabled={cat.productCount > 0}
                          aria-disabled={cat.productCount > 0}
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
        <CategoryForm
          initial={editTarget}
          saving={saving}
          error={formError}
          fieldErrors={fieldErrors}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa danh mục?"
        message={deleteTarget
          ? `Bạn có chắc muốn xóa danh mục "${deleteTarget.name}" không? Thao tác này không thể hoàn tác.`
          : ''}
        confirmLabel="Xác nhận xóa"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}