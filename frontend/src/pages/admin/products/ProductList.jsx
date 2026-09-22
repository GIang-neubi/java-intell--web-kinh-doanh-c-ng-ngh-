import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2, Package, X } from 'lucide-react';
import { deleteProduct, fetchProducts } from '../../../api/products';
import { fetchCategories } from '../../../api/categories';
import { fetchBrands } from '../../../api/brands';
import { getErrorMessage } from '../../../api/client';
import { formatPrice } from '../../../utils/helpers';
import { resolveImageUrl } from '../../../utils/imageUrl';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import AdminPagination from '../../../components/admin/AdminPagination';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';

const PAGE_SIZE = 10;

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pageNo, setPageNo] = useState(Number(searchParams.get('page') || 0));
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') || '');
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [brandId, setBrandId] = useState(searchParams.get('brandId') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  const loadMeta = useCallback(async () => {
    try {
      const [cats, brs] = await Promise.all([fetchCategories(), fetchBrands()]);
      setCategories(cats);
      setBrands(brs);
    } catch {
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProducts({
        keyword: keyword.trim() || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        pageNo,
        pageSize: PAGE_SIZE,
        sortBy: 'id',
        sortDir: 'desc',
      });
      setItems(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách sản phẩm'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, categoryId, brandId, pageNo]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const params = {};
    if (keyword.trim()) params.q = keyword.trim();
    if (categoryId) params.categoryId = categoryId;
    if (brandId) params.brandId = brandId;
    if (pageNo > 0) params.page = String(pageNo);
    setSearchParams(params, { replace: true });
  }, [keyword, categoryId, brandId, pageNo, setSearchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPageNo(0);
    setKeyword(keywordInput);
  };

  const clearFilters = () => {
    setKeywordInput('');
    setKeyword('');
    setCategoryId('');
    setBrandId('');
    setPageNo(0);
  };

  const hasFilters = keyword || categoryId || brandId;

  const handleDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      const res = await deleteProduct(target.id);
      const soft = res?.data?.softDeleted;
      setToast(res?.message || (soft
        ? `Sản phẩm "${target.name}" đã được chuyển sang ngừng bán.`
        : `Đã xóa "${target.name}"`));
      setToastType('success');
      setTarget(null);
      if (!soft && items.length === 1 && pageNo > 0) setPageNo((p) => p - 1);
      else await load();
    } catch (err) {
      setToast(getErrorMessage(err, 'Xóa sản phẩm thất bại'));
      setToastType('error');
      setTarget(null);
    } finally {
      setDeleting(false);
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
            <input
              className="form-input"
              placeholder="Tìm theo tên sản phẩm..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
            />
          </div>
          <select
            className="form-input"
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPageNo(0); }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="form-input"
            value={brandId}
            onChange={(e) => { setBrandId(e.target.value); setPageNo(0); }}
          >
            <option value="">Tất cả thương hiệu</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-outline btn-sm">Tìm kiếm</button>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={14} /> Xóa bộ lọc
            </button>
          )}
        </form>
        <Link to="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={15} /> Thêm sản phẩm
        </Link>
      </div>

      <div className="hg-admin-meta">
        <span>{totalElements} sản phẩm</span>
      </div>

      {loading ? (
        <AdminLoading label="Đang tải sản phẩm..." />
      ) : error ? (
        <AdminError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <AdminEmpty
            icon={Package}
            title={hasFilters ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm"}
            description={hasFilters ? `Không có sản phẩm nào khớp với "${keyword}"` : "Thử đổi bộ lọc hoặc thêm sản phẩm mới."}
          />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="hg-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Ảnh</th>
                  <th style={{ minWidth: 220 }}>Sản phẩm</th>
                  <th style={{ minWidth: 140 }}>Danh mục</th>
                  <th style={{ minWidth: 140 }}>Thương hiệu</th>
                  <th style={{ width: 130 }}>Giá</th>
                  <th style={{ width: 90 }}>Tồn kho</th>
                  <th style={{ width: 110 }}>Trạng thái</th>
                  <th style={{ width: 110 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="hg-product-thumb-sm">
                        {p.image ? (
                          <img src={resolveImageUrl(p.image)} alt={p.name} loading="lazy" />
                        ) : (
                          <Package size={18} />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="hg-product-cell">
                        <div className="hg-product-name">{p.name}</div>
                        <div className="hg-product-id">ID: {p.id}</div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{p.categoryName || '—'}</span>
                    </td>
                    <td>{p.brandName || '—'}</td>
                    <td className="hg-price-cell">
                      {p.salePrice != null && p.salePrice < p.price ? (
                        <>
                          <div className="hg-price-sale">{formatPrice(p.salePrice)}</div>
                          <div className="hg-price-original">{formatPrice(p.price)}</div>
                        </>
                      ) : (
                        <div className="hg-price-regular">{formatPrice(p.price)}</div>
                      )}
                    </td>
                    <td>
                      <span className={`hg-stock ${p.stock === 0 ? 'out' : p.stock < 5 ? 'low' : ''}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${p.status ? 'status-delivered' : 'status-cancelled'}`}>
                        {p.status ? 'Đang bán' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td>
                      <div className="hg-row-actions">
                        <Link to={`/admin/products/${p.id}`} title="Xem chi tiết" className="action-btn view">
                          <Eye size={16} />
                        </Link>
                        <Link to={`/admin/products/${p.id}/edit`} title="Chỉnh sửa" className="action-btn edit">
                          <Pencil size={16} />
                        </Link>
                        <button
                          type="button"
                          className="action-btn delete"
                          title="Xóa"
                          onClick={() => setTarget(p)}
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
          <AdminPagination pageNo={pageNo} totalPages={totalPages} onChange={setPageNo} />
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        title="Xóa sản phẩm?"
        message={target ? `Bạn có chắc muốn xóa sản phẩm "${target.name}" không? Nếu sản phẩm đã từng được bán, hệ thống sẽ chuyển sang ngừng bán thay vì xóa hẳn.` : ''}
        confirmLabel="Xác nhận xóa"
        loading={deleting}
        onCancel={() => setTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}