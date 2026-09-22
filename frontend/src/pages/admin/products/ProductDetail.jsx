import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Pencil, Trash2 } from 'lucide-react';
import { deleteProduct, fetchProductById } from '../../../api/products';
import { getErrorMessage } from '../../../api/client';
import { formatDate, formatPrice } from '../../../utils/helpers';
import { resolveImageUrl } from '../../../utils/imageUrl';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProductById(id);
      setProduct(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được chi tiết sản phẩm'));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteProduct(id);
      if (res?.data?.softDeleted) {
        setToast(res.message || 'Sản phẩm đã chuyển sang ngừng bán.');
        setConfirmOpen(false);
        await load();
      } else {
        navigate('/admin/products');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Xóa sản phẩm thất bại'));
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <AdminLoading label="Đang tải chi tiết sản phẩm..." />;
  if (error && !product) return <AdminError message={error} onRetry={load} />;
  if (!product) return null;

  const displayPrice = product.salePrice != null ? product.salePrice : product.price;

  return (
    <div className="hg-admin-module">
      {toast && <div className="alert alert-success">{toast}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="hg-admin-toolbar">
        <Link to="/admin/products" className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} /> Danh sách
        </Link>
        <div className="hg-toolbar-right">
          <Link to={`/admin/products/${id}/edit`} className="btn btn-outline btn-sm">
            <Pencil size={15} /> Sửa
          </Link>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={15} /> Xóa
          </button>
        </div>
      </div>

      <div className="card hg-detail-card">
        <div className="hg-detail-media">
          {product.image ? (
            <img src={resolveImageUrl(product.image)} alt={product.name} />
          ) : (
            <div className="hg-detail-placeholder"><Package size={48} /></div>
          )}
        </div>
        <div className="hg-detail-body">
          <div className="hg-detail-badges">
            <span className="badge badge-primary">{product.categoryName || '—'}</span>
            <span className={`status-badge ${product.status ? 'status-delivered' : 'status-cancelled'}`}>
              {product.status ? 'Đang bán' : 'Tạm dừng'}
            </span>
          </div>
          <h2>{product.name}</h2>
          <div className="hg-detail-price">
            {formatPrice(displayPrice)}
            {product.salePrice != null && (
              <span style={{ marginLeft: 10, fontSize: 16, color: '#9ca3af', textDecoration: 'line-through', fontWeight: 500 }}>
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <div className="hg-detail-grid">
            <div><span>Thương hiệu</span><strong>{product.brandName || '—'}</strong></div>
            <div><span>Khối lượng</span><strong>{product.weightKg != null ? `${product.weightKg} kg` : 'Chưa cập nhật'}</strong></div>
            <div><span>Tồn kho</span><strong style={{ color: product.stock < 5 ? 'var(--danger)' : 'inherit' }}>{product.stock}</strong></div>
            <div><span>ID</span><strong>{product.id}</strong></div>
            <div><span>Cập nhật</span><strong>{product.updatedAt ? formatDate(product.updatedAt) : '—'}</strong></div>
            <div><span>Ngày tạo</span><strong>{product.createdAt ? formatDate(product.createdAt) : '—'}</strong></div>
          </div>

          <div className="hg-detail-desc">
            <h3>Mô tả</h3>
            <p>{product.description || 'Chưa có mô tả.'}</p>
          </div>

          <div className="hg-detail-desc">
            <h3>Thông số kỹ thuật</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{product.specifications || 'Chưa có thông số.'}</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Xóa sản phẩm?"
        message={`Bạn có chắc muốn xóa sản phẩm "${product.name}" không? Nếu đã từng được bán, hệ thống sẽ chuyển sang ngừng bán.`}
        confirmLabel="Xác nhận"
        loading={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
