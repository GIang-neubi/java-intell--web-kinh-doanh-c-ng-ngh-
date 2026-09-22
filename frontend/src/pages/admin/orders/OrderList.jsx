import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Eye, ShoppingBag, X } from 'lucide-react';
import { fetchAdminOrders } from '../../../api/orders';
import { getErrorMessage } from '../../../api/client';
import { formatDate, formatPrice, statusLabel } from '../../../utils/helpers';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import AdminPagination from '../../../components/admin/AdminPagination';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '',           label: 'Tất cả trạng thái' },
  { value: 'PENDING',    label: 'Chờ xác nhận' },
  { value: 'CONFIRMED',  label: 'Đã xác nhận' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING',   label: 'Đang giao' },
  { value: 'DELIVERED',  label: 'Đã giao' },
  { value: 'CANCELLED',  label: 'Đã hủy' },
];

const DATE_RANGE_OPTIONS = [
  { value: '', label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: '7 ngày qua' },
  { value: 'month', label: '30 ngày qua' },
  { value: 'quarter', label: '90 ngày qua' },
  { value: 'year', label: '1 năm qua' },
];

const PAYMENT_LABEL = { COD: 'COD', BANKING: 'Chuyển khoản' };

export default function OrderList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems]               = useState([]);
  const [pageNo, setPageNo]             = useState(Number(searchParams.get('page') || 0));
  const [totalPages, setTotalPages]     = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [toast, setToast]               = useState('');

  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') || '');
  const [keyword, setKeyword]           = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [dateFilter, setDateFilter]     = useState(searchParams.get('dateRange') || '');

  // ── load ──
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminOrders({
        keyword:    keyword.trim() || undefined,
        status:     statusFilter   || undefined,
        dateRange:  dateFilter     || undefined,
        pageNo,
        pageSize:   PAGE_SIZE,
      });
      setItems(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách đơn hàng'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, dateFilter, pageNo]);

  useEffect(() => { load(); }, [load]);

  // sync URL
  useEffect(() => {
    const p = {};
    if (keyword)      p.q          = keyword;
    if (statusFilter) p.status     = statusFilter;
    if (dateFilter)   p.dateRange  = dateFilter;
    if (pageNo > 0)   p.page       = String(pageNo);
    setSearchParams(p, { replace: true });
  }, [keyword, statusFilter, dateFilter, pageNo, setSearchParams]);

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
    setStatusFilter('');
    setDateFilter('');
    setPageNo(0);
  };

  const hasFilters = keyword || statusFilter || dateFilter;

  return (
    <div className="hg-admin-module">
      {toast && (
        <div className="alert alert-danger" role="alert">
          {toast}
        </div>
      )}

      <div className="hg-admin-toolbar">
        <form className="hg-admin-filters" onSubmit={handleSearch}>
          <div className="hg-admin-search">
            <Search size={16} />
            <input
              className="form-input"
              placeholder="Tìm theo mã đơn, tên, username..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
            />
          </div>
          <select
            className="form-input"
            style={{ minWidth: 160 }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPageNo(0); }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="form-input"
            style={{ minWidth: 150 }}
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPageNo(0); }}
          >
            {DATE_RANGE_OPTIONS.map((o) => (
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
        <span>{totalElements} đơn hàng</span>
      </div>

      {loading ? (
        <AdminLoading label="Đang tải đơn hàng..." />
      ) : error && items.length === 0 ? (
        <AdminError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <AdminEmpty
            icon={ShoppingBag}
            title={hasFilters ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng nào"}
            description={hasFilters ? `Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm` : "Đơn hàng mới sẽ hiện tại đây."}
          />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="hg-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Mã đơn</th>
                  <th style={{ minWidth: 180 }}>Khách hàng</th>
                  <th style={{ width: 140 }}>Ngày đặt</th>
                  <th style={{ width: 80 }}>Sản phẩm</th>
                  <th style={{ width: 130 }}>Tổng tiền</th>
                  <th style={{ width: 100 }}>Thanh toán</th>
                  <th style={{ width: 120 }}>Trạng thái</th>
                  <th style={{ width: 80 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders/${o.id}`} style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', fontFamily: 'monospace', textDecoration: 'none' }}>
                        {o.orderCode}
                      </Link>
                    </td>
                    <td>
                      <div className="hg-customer-cell">
                        <div className="hg-customer-name">{o.customerName || '—'}</div>
                        <div className="hg-customer-username">@{o.customerUsername || '—'}</div>
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {o.createdAt ? formatDate(o.createdAt) : '—'}
                    </td>
                    <td className="text-secondary" style={{ fontSize: 13, fontWeight: 600 }}>
                      {o.items?.length || 0} mặt hàng
                    </td>
                    <td className="hg-price-cell">
                      {formatPrice(o.totalAmount)}
                    </td>
                    <td>
                      <span className="hg-payment-badge">{PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod}</span>
                    </td>
                    <td>
                      <span className={`hg-status-badge ${o.status}`}>
                        {statusLabel[o.status] || o.status}
                      </span>
                    </td>
                    <td>
                      <div className="hg-row-actions">
                        <Link to={`/admin/orders/${o.id}`} title="Xem chi tiết" className="action-btn view">
                          <Eye size={16} />
                        </Link>
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
    </div>
  );
}