import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Pencil, Trash2, Star, CheckCircle } from 'lucide-react';
import { deleteProduct, fetchProductById } from '../../../api/products';
import api, { getErrorMessage } from '../../../api/client';
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

  // Reviews moderation state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, reviewCount: 0, distribution: {} });
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deletingReview, setDeletingReview] = useState(false);

  const loadReviews = useCallback(async (page = 0) => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const [revRes, statsRes] = await Promise.all([
        api.get(`/reviews/product/${id}?page=${page}&size=10`),
        api.get(`/reviews/product/${id}/stats`),
      ]);
      if (revRes.data.success && revRes.data.data) {
        setReviews(revRes.data.data.content || []);
        setReviewPage(revRes.data.data.pageNo || 0);
        setReviewTotalPages(revRes.data.data.totalPages || 0);
      }
      if (statsRes.data.success && statsRes.data.data) {
        setReviewStats(statsRes.data.data);
      }
    } catch { /* ignore */ }
    finally { setReviewsLoading(false); }
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProductById(id);
      setProduct(data);
      await loadReviews(0);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được chi tiết sản phẩm'));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id, loadReviews]);

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

  const handleDeleteReviewAdmin = async () => {
    if (!reviewToDelete) return;
    setDeletingReview(true);
    try {
      const { data } = await api.delete(`/reviews/${reviewToDelete.id}/admin`);
      if (data.success) {
        setToast('Đã xóa đánh giá thành công.');
        setReviewToDelete(null);
        await loadReviews(reviewPage);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Xóa đánh giá thất bại'));
      setReviewToDelete(null);
    } finally {
      setDeletingReview(false);
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

      {/* Customer Reviews Moderation */}
      <div className="card" style={{ marginTop: 24, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Đánh giá của khách hàng</h3>
            <span className="badge badge-primary">{reviewStats.reviewCount || 0} đánh giá</span>
          </div>
          {reviewStats.reviewCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700 }}>
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
              <span>{reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : '0.0'} / 5</span>
            </div>
          )}
        </div>

        {reviewsLoading ? (
          <AdminLoading label="Đang tải đánh giá..." />
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            Chưa có đánh giá nào cho sản phẩm này.
          </div>
        ) : (
          <div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Xác thực</th>
                    <th>Số sao</th>
                    <th>Nội dung nhận xét</th>
                    <th>Thời gian</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.fullName || r.username}</td>
                      <td>
                        {r.verified ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803d', fontSize: 12, fontWeight: 600 }}>
                            <CheckCircle size={13} /> Đã mua
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chưa mua</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={13} fill={s <= r.rating ? '#f59e0b' : 'none'} color={s <= r.rating ? '#f59e0b' : '#d1d5db'} />
                          ))}
                        </div>
                      </td>
                      <td style={{ maxWidth: 300, fontSize: 13, color: 'var(--text-secondary)' }}>
                        {r.comment || <em style={{ color: 'var(--text-muted)' }}>Không có nhận xét</em>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {r.createdAt ? formatDate(r.createdAt) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setReviewToDelete(r)}
                          title="Xóa đánh giá này"
                          style={{ padding: '4px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reviewTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  disabled={reviewPage === 0}
                  onClick={() => loadReviews(reviewPage - 1)}
                  className="btn btn-outline btn-sm"
                >
                  Trang trước
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {reviewPage + 1} / {reviewTotalPages}
                </span>
                <button
                  type="button"
                  disabled={reviewPage >= reviewTotalPages - 1}
                  onClick={() => loadReviews(reviewPage + 1)}
                  className="btn btn-outline btn-sm"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        )}
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

      <ConfirmDialog
        open={Boolean(reviewToDelete)}
        title="Xóa đánh giá này?"
        message={`Bạn có chắc muốn xóa đánh giá của khách hàng "${reviewToDelete?.fullName || reviewToDelete?.username || ''}" (${reviewToDelete?.rating || 0} sao) không?`}
        confirmLabel="Xóa đánh giá"
        loading={deletingReview}
        onCancel={() => setReviewToDelete(null)}
        onConfirm={handleDeleteReviewAdmin}
      />
    </div>
  );
}
