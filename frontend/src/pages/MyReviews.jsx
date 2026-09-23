import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import AccountLayout from '../layouts/AccountLayout';
import { useToast } from '../components/Toast';
import { resolveImageUrl } from '../utils/imageUrl';
import { formatDate } from '../utils/helpers';
import api, { getErrorMessage } from '../api/client';

function StarDisplay({ value, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size}
          fill={s <= Math.round(value) ? '#111' : 'none'}
          color={s <= Math.round(value) ? '#111' : '#d1d5db'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
          aria-label={`${s} sao`}
        >
          <Star size={24}
            fill={s <= (hover || value) ? '#111' : 'none'}
            color={s <= (hover || value) ? '#111' : '#d1d5db'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export default function MyReviews() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadReviews = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const { data } = await api.get('/reviews/my', { params: { page: p, size: 8 } });
      if (data.success) {
        setReviews(data.data.content || []);
        setTotalPages(data.data.totalPages || 0);
        setTotalElements(data.data.totalElements || 0);
      }
    } catch {
      showToast('Không thể tải đánh giá', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadReviews(page); }, [page, loadReviews]);

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditRating(r.rating);
    setEditComment(r.comment || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRating(0);
    setEditComment('');
  };

  const submitEdit = async (reviewId) => {
    if (!editRating) { showToast('Vui lòng chọn số sao', 'warning'); return; }
    setEditSubmitting(true);
    try {
      await api.put(`/reviews/${reviewId}`, { rating: editRating, comment: editComment.trim() || null });
      showToast('Đã cập nhật đánh giá', 'success');
      cancelEdit();
      loadReviews(page);
    } catch (err) {
      showToast(getErrorMessage(err, 'Cập nhật thất bại'), 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/reviews/${deletingId}`);
      showToast('Đã xóa đánh giá', 'success');
      setDeletingId(null);
      loadReviews(page);
    } catch (err) {
      showToast(getErrorMessage(err, 'Xóa thất bại'), 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <AccountLayout activeTab="reviews">
      <div>
        <div style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-5)', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Đánh giá của tôi</h2>
          {!loading && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {totalElements > 0 ? `${totalElements} đánh giá đã gửi` : 'Chưa có đánh giá nào'}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
            <Star size={40} style={{ margin: '0 auto var(--space-4)', opacity: 0.15 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Bạn chưa đánh giá sản phẩm nào
            </div>
            <div style={{ fontSize: 14, marginBottom: 24 }}>
              Mua hàng và chia sẻ trải nghiệm của bạn để giúp cộng đồng!
            </div>
            <Link to="/products" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {reviews.map((r) => (
              <div
                key={r.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  background: '#fff',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {/* Product header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-4) var(--space-5)',
                  background: 'var(--bg)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {r.productImage ? (
                    <img
                      src={resolveImageUrl(r.productImage)}
                      alt={r.productName}
                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexShrink: 0 }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📷</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/products/${r.productId}`}
                      style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {r.productName}
                    </Link>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(r.createdAt)}</div>
                  </div>
                  {r.verified && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px',
                      background: '#ecfdf5', color: '#065f46',
                      borderRadius: 'var(--radius-full)', flexShrink: 0,
                      border: '1px solid #a7f3d0',
                    }}>
                      ✓ Đã mua hàng
                    </span>
                  )}
                </div>

                {/* Review body */}
                <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  {editingId === r.id ? (
                    // ── Edit mode ──────────────────────────────────────────────
                    <div>
                      <div style={{ marginBottom: 'var(--space-3)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Điểm đánh giá</div>
                        <StarPicker value={editRating} onChange={setEditRating} />
                      </div>
                      <div style={{ marginBottom: 'var(--space-3)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Nhận xét</div>
                        <textarea
                          className="form-input"
                          rows={3}
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          placeholder="Chia sẻ trải nghiệm của bạn..."
                          style={{ resize: 'vertical', fontSize: 13 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => submitEdit(r.id)}
                          disabled={editSubmitting}
                          className="btn btn-primary"
                          style={{ padding: '8px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Check size={14} /> {editSubmitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={editSubmitting}
                          className="btn btn-outline"
                          style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <X size={14} /> Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── View mode ──────────────────────────────────────────────
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <StarDisplay value={r.rating} size={16} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            title="Sửa đánh giá"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                              background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                              padding: '5px 12px', cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                          >
                            <Pencil size={12} /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(r.id)}
                            title="Xóa đánh giá"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              fontSize: 12, fontWeight: 600, color: 'var(--danger)',
                              background: 'none', border: '1px solid #fee2e2', borderRadius: 'var(--radius-md)',
                              padding: '5px 12px', cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                          >
                            <Trash2 size={12} /> Xóa
                          </button>
                        </div>
                      </div>
                      {r.comment ? (
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{r.comment}</p>
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>Không có nhận xét</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                    background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: page === 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Trang {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                    background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: page >= totalPages - 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deletingId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setDeletingId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', maxWidth: 400, width: '100%', boxShadow: 'var(--shadow-xl)' }}
          >
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Xóa đánh giá?</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
              Hành động này không thể hoàn tác. Đánh giá của bạn sẽ bị xóa vĩnh viễn.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeletingId(null)} className="btn btn-outline" disabled={deleteSubmitting}>
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteSubmitting}
                style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-lg)', fontWeight: 700, fontSize: 14,
                  background: 'var(--danger)', color: '#fff', border: 'none', cursor: deleteSubmitting ? 'wait' : 'pointer',
                }}
              >
                {deleteSubmitting ? 'Đang xóa...' : 'Xóa đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
