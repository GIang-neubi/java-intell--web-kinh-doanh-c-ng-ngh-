import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2, Plus, Search, Eye, Pencil, Trash2, MapPin, Phone,
  CheckCircle, AlertCircle, RefreshCw, Map as MapIcon,
  ArrowDownToLine, History, ExternalLink, X, Save
} from 'lucide-react';
import { fetchWarehouses, updateWarehouseStatus, deleteWarehouse, fetchWarehouseDetail } from '../../../api/warehouses';
import { fetchProducts } from '../../../api/products';
import { importInventory, fetchInventoryLogs } from '../../../api/inventory';
import { getErrorMessage } from '../../../api/client';
import { formatDate } from '../../../utils/helpers';
import { resolveImageUrl } from '../../../utils/imageUrl';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import AdminPagination from '../../../components/admin/AdminPagination';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import WarehouseOverviewMap from '../../../components/map/WarehouseOverviewMap';

const TABS = [
  { id: 'list', label: '1. Danh sách kho', icon: Building2 },
  { id: 'map', label: '2. Bản đồ kho', icon: MapIcon },
  { id: 'import', label: '3. Tạo phiếu nhập', icon: ArrowDownToLine },
  { id: 'history', label: '4. Lịch sử nhập kho', icon: History },
];

export default function WarehouseList({ defaultTab = 'list' }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab state: 'list' | 'map' | 'import' | 'history'
  const initialTab = searchParams.get('tab') || defaultTab || 'list';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab change with URL query params
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // ================= TAB 1 & 2: WAREHOUSE STATE =================
  const [warehouses, setWarehouses] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Detail Drawer State
  const [detailWarehouse, setDetailWarehouse] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ================= TAB 3: STOCK RECEIPT STATE =================
  const [receiptWarehouseId, setReceiptWarehouseId] = useState('');
  const [receiptItems, setReceiptItems] = useState([]); // { productId, name, image, stock, quantity, note }
  const [generalNote, setGeneralNote] = useState('');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState('');
  const [receiptError, setReceiptError] = useState('');

  // Product Search for Receipt
  const [prodKeyword, setProdKeyword] = useState('');
  const [prodSearchResults, setProdSearchResults] = useState([]);
  const [prodSearching, setProdSearching] = useState(false);

  // ================= TAB 4: RECEIPT HISTORY STATE =================
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(0);

  // Load warehouses
  const loadWarehouses = useCallback(async (p = 0) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWarehouses({ page: p, size: 20 });
      setWarehouses(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
      setPage(data.number || 0);

      // Pre-select warehouse for stock receipt if none selected
      if (data.content && data.content.length > 0) {
        setReceiptWarehouseId((prev) => prev || data.content[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách kho'));
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load receipt history logs
  const loadLogs = useCallback(async (p = 0) => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const data = await fetchInventoryLogs({ page: p, size: 20 });
      setLogs(data.content || []);
      setLogsTotalPages(data.totalPages || 0);
      setLogsPage(data.number || 0);
    } catch (err) {
      setLogsError(err.message || 'Không tải được lịch sử nhập kho');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWarehouses(0);
  }, [loadWarehouses]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadLogs(0);
    }
  }, [activeTab, loadLogs]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Status toggle
  const handleToggleStatus = async (wh) => {
    const nextStatus = wh.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateWarehouseStatus(wh.id, nextStatus);
      setToast(`Đã chuyển kho ${wh.warehouseCode} sang trạng thái ${nextStatus}`);
      loadWarehouses(page);
      if (detailWarehouse && detailWarehouse.id === wh.id) {
        setDetailWarehouse((prev) => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi cập nhật trạng thái kho'));
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWarehouse(deleteTarget.id);
      setToast(`Đã xóa kho "${deleteTarget.name}" thành công`);
      setDeleteTarget(null);
      loadWarehouses(page);
      if (detailWarehouse && detailWarehouse.id === deleteTarget.id) {
        setDetailWarehouse(null);
      }
    } catch (err) {
      alert(getErrorMessage(err, 'Không thể xóa kho hàng này.'));
    } finally {
      setDeleting(false);
    }
  };

  // Open Detail Drawer
  const handleOpenDetail = async (wh) => {
    setDetailWarehouse(wh);
    setDetailLoading(true);
    try {
      const fresh = await fetchWarehouseDetail(wh.id);
      setDetailWarehouse(fresh);
    } catch {
      // retain initial object
    } finally {
      setDetailLoading(false);
    }
  };

  // ================= TAB 3: STOCK RECEIPT HANDLERS =================
  const handleProductSearch = async (e) => {
    e.preventDefault();
    if (!prodKeyword.trim()) return;
    setProdSearching(true);
    try {
      const res = await fetchProducts({ keyword: prodKeyword.trim(), pageNo: 0, pageSize: 8 });
      setProdSearchResults(res.content || []);
    } catch {
      setProdSearchResults([]);
    } finally {
      setProdSearching(false);
    }
  };

  const handleAddProductToReceipt = (product) => {
    if (receiptItems.some((item) => item.productId === product.id)) return;
    setReceiptItems([
      ...receiptItems,
      {
        productId: product.id,
        name: product.name,
        image: product.image,
        stock: product.stock,
        quantity: 1,
        note: '',
      },
    ]);
    setProdKeyword('');
    setProdSearchResults([]);
  };

  const handleRemoveReceiptItem = (productId) => {
    setReceiptItems(receiptItems.filter((i) => i.productId !== productId));
  };

  const handleReceiptQuantityChange = (productId, qty) => {
    const val = Math.max(1, parseInt(qty, 10) || 1);
    setReceiptItems(receiptItems.map((i) => (i.productId === productId ? { ...i, quantity: val } : i)));
  };

  const handleReceiptItemNoteChange = (productId, note) => {
    setReceiptItems(receiptItems.map((i) => (i.productId === productId ? { ...i, note } : i)));
  };

  const handleSubmitStockReceipt = async (e) => {
    e.preventDefault();
    if (!receiptWarehouseId) {
      setReceiptError('Vui lòng chọn kho hàng nhận hàng.');
      return;
    }
    if (receiptItems.length === 0) {
      setReceiptError('Vui lòng thêm ít nhất một sản phẩm vào phiếu nhập.');
      return;
    }

    setSubmittingReceipt(true);
    setReceiptError('');
    setReceiptSuccess('');

    try {
      const payload = {
        warehouseId: Number(receiptWarehouseId),
        note: generalNote,
        items: receiptItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          note: i.note,
        })),
      };
      await importInventory(payload);

      setReceiptSuccess(`Tạo phiếu nhập thành công cho ${receiptItems.length} sản phẩm!`);
      setReceiptItems([]);
      setGeneralNote('');
      loadWarehouses(page);
    } catch (err) {
      setReceiptError(getErrorMessage(err, 'Lỗi khi tạo phiếu nhập kho'));
    } finally {
      setSubmittingReceipt(false);
    }
  };

  // Filter warehouses for Tab 1
  const filteredWarehouses = warehouses.filter((wh) => {
    const matchKw =
      !keyword.trim() ||
      wh.name.toLowerCase().includes(keyword.toLowerCase()) ||
      wh.warehouseCode.toLowerCase().includes(keyword.toLowerCase()) ||
      (wh.address && wh.address.toLowerCase().includes(keyword.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || wh.status === statusFilter;
    return matchKw && matchStatus;
  });

  const activeCount = warehouses.filter((w) => w.status === 'ACTIVE').length;
  const inactiveCount = warehouses.filter((w) => w.status === 'INACTIVE').length;
  const mappedCount = warehouses.filter((w) => typeof w.latitude === 'number' && typeof w.longitude === 'number').length;

  return (
    <div className="hg-admin-module" style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          }}
        >
          <CheckCircle size={18} /> {toast}
        </div>
      )}

      {/* Main Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Hệ thống Quản lý Kho hàng & Nhập xuất
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Quản lý danh mục kho, bản đồ định vị GPS, tạo phiếu nhập kho và tra cứu lịch sử nhập xuất
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'history') loadLogs(logsPage);
              else loadWarehouses(page);
            }}
            className="btn btn-secondary"
            title="Làm mới dữ liệu"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}
          >
            <RefreshCw size={15} />
            <span>Làm mới</span>
          </button>

          <Link
            to="/admin/warehouses/new"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>Thêm kho mới</span>
          </Link>
        </div>
      </div>

      {/* 4 PRIMARY TABS (PHASE 15 REQUIREMENT) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#0a3d8f' : 'var(--text-secondary)',
                background: isActive ? '#ffffff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #0a3d8f' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 -2px 6px rgba(0,0,0,0.03)' : 'none',
              }}
            >
              <Icon size={16} style={{ color: isActive ? '#0a3d8f' : '#64748b' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================== */}
      {/* TAB 1: DANH SÁCH KHO (WAREHOUSE LIST)                     */}
      {/* ========================================================== */}
      {activeTab === 'list' && (
        <div>
          {/* KPI Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#0a3d8f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng số kho</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{totalElements || warehouses.length}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang hoạt động</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{activeCount}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tạm ngưng</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#e11d48' }}>{inactiveCount}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={22} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã ghim GPS</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7' }}>{mappedCount} / {warehouses.length}</div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm theo mã kho, tên kho, địa chỉ..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  background: '#ffffff',
                }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Tạm ngưng</option>
              </select>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Hiển thị <strong>{filteredWarehouses.length}</strong> kho hàng
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <AdminLoading label="Đang tải danh sách kho..." />
          ) : error ? (
            <AdminError message={error} onRetry={() => loadWarehouses(page)} />
          ) : filteredWarehouses.length === 0 ? (
            <AdminEmpty title="Không tìm thấy kho nào" description="Thử thay đổi từ khóa hoặc bộ lọc trạng thái." />
          ) : (
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Mã kho</th>
                    <th style={{ padding: '12px 16px' }}>Tên kho hàng</th>
                    <th style={{ padding: '12px 16px' }}>Địa chỉ & Liên hệ</th>
                    <th style={{ padding: '12px 16px' }}>Tọa độ GPS</th>
                    <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarehouses.map((wh) => {
                    const hasCoords = typeof wh.latitude === 'number' && typeof wh.longitude === 'number';
                    return (
                      <tr key={wh.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                        <td style={{ padding: '12px 16px', fontWeight: 800, fontFamily: 'monospace', color: '#0a3d8f' }}>
                          {wh.warehouseCode}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Building2 size={16} style={{ color: '#64748b' }} />
                            <span>{wh.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: 300 }}>
                          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }} title={wh.address}>
                            {wh.address || 'Chưa cập nhật địa chỉ'}
                          </div>
                          {wh.phone && (
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Phone size={11} /> <span>{wh.phone}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {hasCoords ? (
                            <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                              📍 {wh.latitude.toFixed(4)}, {wh.longitude.toFixed(4)}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#f59e0b', background: '#fffbeb', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                              Chưa ghim vị trí
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: wh.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                              color: wh.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {wh.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngưng'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(wh)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Xem chi tiết kho"
                            >
                              <Eye size={13} />
                              <span>Chi tiết</span>
                            </button>

                            <Link
                              to={`/admin/warehouses/${wh.id}/edit`}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Sửa thông tin kho"
                            >
                              <Pencil size={13} />
                              <span>Sửa</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(wh)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', fontSize: 12 }}
                              title={wh.status === 'ACTIVE' ? 'Tạm ngưng kho' : 'Kích hoạt kho'}
                            >
                              {wh.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(wh)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', fontSize: 12, color: '#e11d48' }}
                              title="Xóa kho hàng"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
                  <AdminPagination page={page} totalPages={totalPages} onPageChange={(p) => loadWarehouses(p)} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 2: BẢN ĐỒ KHO (WAREHOUSE MAP - PHASE 16)              */}
      {/* ========================================================== */}
      {activeTab === 'map' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <WarehouseOverviewMap warehouses={warehouses} loading={loading} />
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 3: TẠO PHIẾU NHẬP (STOCK RECEIPT)                      */}
      {/* ========================================================== */}
      {activeTab === 'import' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* Left Column: Warehouse Select & Product Add */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowDownToLine size={18} style={{ color: '#0a3d8f' }} />
              <span>Tạo phiếu nhập hàng vào kho</span>
            </h3>

            {receiptSuccess && (
              <div className="alert alert-success" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} />
                  <span>{receiptSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('history')}
                  style={{ background: 'none', border: 'none', color: '#047857', fontWeight: 700, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
                >
                  Xem lịch sử nhập kho →
                </button>
              </div>
            )}

            {receiptError && (
              <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} />
                <span>{receiptError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStockReceipt}>
              {/* Select Destination Warehouse */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Kho hàng nhập hàng <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <select
                  value={receiptWarehouseId}
                  onChange={(e) => setReceiptWarehouseId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    fontWeight: 600,
                    background: '#ffffff',
                  }}
                >
                  <option value="">-- Chọn kho hàng nhận sản phẩm --</option>
                  {warehouses
                    .filter((w) => w.status === 'ACTIVE')
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseCode} - {w.name} ({w.address})
                      </option>
                    ))}
                </select>
              </div>

              {/* Product Search Box */}
              <div style={{ marginBottom: 20, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Tìm sản phẩm cần nhập kho
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Nhập tên máy ảnh, ống kính, phụ kiện để tìm..."
                      value={prodKeyword}
                      onChange={(e) => setProdKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleProductSearch(e);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 38px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontSize: 13,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleProductSearch}
                    disabled={prodSearching}
                    className="btn btn-secondary"
                    style={{ padding: '0 18px', fontWeight: 700, fontSize: 13 }}
                  >
                    {prodSearching ? 'Đang tìm...' : 'Tìm kiếm'}
                  </button>
                </div>

                {/* Instant Search Results Dropdown */}
                {prodSearchResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                      maxHeight: 280,
                      overflowY: 'auto',
                      marginTop: 4,
                    }}
                  >
                    {prodSearchResults.map((prod) => {
                      const alreadyAdded = receiptItems.some((i) => i.productId === prod.id);
                      return (
                        <div
                          key={prod.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: alreadyAdded ? 'default' : 'pointer',
                            background: alreadyAdded ? '#f8fafc' : '#ffffff',
                          }}
                          onClick={() => !alreadyAdded && handleAddProductToReceipt(prod)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                              {prod.image && (
                                <img src={resolveImageUrl(prod.image)} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{prod.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Tồn hiện tại: <strong>{prod.stock || 0}</strong>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={alreadyAdded}
                            className={`btn ${alreadyAdded ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                          >
                            {alreadyAdded ? 'Đã thêm' : '+ Thêm'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Items in Receipt Table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Danh sách sản phẩm trong phiếu ({receiptItems.length})</span>
                  {receiptItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReceiptItems([])}
                      style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: 12, cursor: 'pointer' }}
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {receiptItems.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1', color: 'var(--text-muted)', fontSize: 13 }}>
                    Chưa có sản phẩm nào được chọn. Hãy tìm kiếm ở trên để thêm sản phẩm vào phiếu nhập.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 12px' }}>Sản phẩm</th>
                          <th style={{ padding: '10px 12px', width: 90 }}>Tồn hiện tại</th>
                          <th style={{ padding: '10px 12px', width: 120 }}>SL nhập</th>
                          <th style={{ padding: '10px 12px' }}>Ghi chú</th>
                          <th style={{ padding: '10px 12px', width: 40 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {receiptItems.map((item) => (
                          <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                                  {item.image && (
                                    <img src={resolveImageUrl(item.image)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  )}
                                </div>
                                <span style={{ fontWeight: 600 }}>{item.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{item.stock || 0}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleReceiptQuantityChange(item.productId, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border)',
                                  fontSize: 13,
                                  fontWeight: 700,
                                }}
                              />
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <input
                                type="text"
                                placeholder="Ghi chú (lô hàng, hạn dùng...)"
                                value={item.note}
                                onChange={(e) => handleReceiptItemNoteChange(item.productId, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border)',
                                  fontSize: 12,
                                }}
                              />
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveReceiptItem(item.productId)}
                                style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer' }}
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* General Note */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Ghi chú chung cho phiếu nhập
                </label>
                <textarea
                  rows="3"
                  placeholder="Ví dụ: Nhập lô máy ảnh Sony chính hãng từ nhà phân phối..."
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingReceipt || receiptItems.length === 0}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: submittingReceipt || receiptItems.length === 0 ? 0.6 : 1,
                  cursor: submittingReceipt || receiptItems.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={16} />
                <span>{submittingReceipt ? 'Đang cập nhật tồn kho...' : 'Xác nhận nhập kho'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Receipt Guidance & Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                Tóm tắt phiếu nhập
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số mặt hàng:</span>
                  <strong>{receiptItems.length} sản phẩm</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tổng số lượng nhập:</span>
                  <strong style={{ color: '#0a3d8f', fontSize: 15 }}>
                    {receiptItems.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0)} kiện
                  </strong>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 20, background: '#f8fafc' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: '#0a3d8f' }}>
                💡 Quy tắc quản lý kho H&G
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Khi phiếu nhập kho được xác nhận, số lượng tồn kho của các sản phẩm sẽ được cộng dồn trực tiếp vào cơ sở dữ liệu và lưu vào lịch sử kiểm toán kho.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 4: LỊCH SỬ NHẬP KHO (RECEIPT HISTORY)                 */}
      {/* ========================================================== */}
      {activeTab === 'history' && (
        <div>
          {logsLoading ? (
            <AdminLoading label="Đang tải nhật ký nhập xuất kho..." />
          ) : logsError ? (
            <AdminError message={logsError} onRetry={() => loadLogs(logsPage)} />
          ) : logs.length === 0 ? (
            <AdminEmpty title="Chưa có lịch sử nhập kho" description="Hệ thống chưa ghi nhận phiếu nhập kho nào." />
          ) : (
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px', width: 60 }}>#</th>
                    <th style={{ padding: '12px 16px' }}>Sản phẩm</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tồn trước</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>SL Nhập</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tồn sau</th>
                    <th style={{ padding: '12px 16px' }}>Kho hàng</th>
                    <th style={{ padding: '12px 16px' }}>Người tạo</th>
                    <th style={{ padding: '12px 16px' }}>Thời gian</th>
                    <th style={{ padding: '12px 16px' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.id}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                            {log.productImage && (
                              <img src={resolveImageUrl(log.productImage)} alt={log.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.productName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mã SP: #{log.productId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>{log.previousStock}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#059669' }}>
                        +{log.quantity}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#0a3d8f' }}>
                        {log.currentStock}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 6 }}>
                          {log.warehouseName || 'Kho trung tâm'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>@{log.createdByName || 'admin'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(log.createdAt)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 200 }}>
                        {log.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Logs Pagination */}
              {logsTotalPages > 1 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
                  <AdminPagination page={logsPage} totalPages={logsTotalPages} onPageChange={(p) => loadLogs(p)} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* INLINE WAREHOUSE DETAIL DRAWER                            */}
      {/* ========================================================== */}
      {detailWarehouse && (
        <div
          onClick={() => setDetailWarehouse(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#0a3d8f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Chi tiết kho hàng
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mã: {detailWarehouse.warehouseCode}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailWarehouse(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              {detailLoading ? (
                <AdminLoading label="Đang tải dữ liệu..." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tên kho</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{detailWarehouse.name}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trạng thái</div>
                    <div style={{ marginTop: 4 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          background: detailWarehouse.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: detailWarehouse.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {detailWarehouse.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Địa chỉ</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <MapPin size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                      <span>{detailWarehouse.address || 'Chưa cập nhật'}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hotline liên hệ</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={14} style={{ color: '#64748b' }} />
                      <span>{detailWarehouse.phone || 'Chưa có SĐT'}</span>
                    </div>
                  </div>

                  {/* GPS Coordinates & Google Maps Link */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0a3d8f', textTransform: 'uppercase', marginBottom: 8 }}>
                      TỌA ĐỘ GPS (DÙNG ĐỂ TÍNH PHÍ SHIPPER)
                    </div>
                    {typeof detailWarehouse.latitude === 'number' && typeof detailWarehouse.longitude === 'number' ? (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          Vĩ độ: {detailWarehouse.latitude} · Kinh độ: {detailWarehouse.longitude}
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${detailWarehouse.latitude},${detailWarehouse.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 10,
                            padding: '8px 14px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#0a3d8f',
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={13} />
                          <span>Mở trên Google Maps</span>
                        </a>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#b45309' }}>
                        Kho này chưa được cấu hình tọa độ GPS. Hãy bấm nút "Sửa kho" để ghim vị trí.
                      </div>
                    )}
                  </div>

                  {/* Quick Action: Nhập kho cho kho này */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptWarehouseId(detailWarehouse.id);
                        setDetailWarehouse(null);
                        handleTabChange('import');
                      }}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <ArrowDownToLine size={15} />
                      <span>Tạo phiếu nhập cho kho này</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
              <Link
                to={`/admin/warehouses/${detailWarehouse.id}/edit`}
                className="btn btn-primary"
                style={{ flex: 1, textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 700 }}
              >
                Sửa thông tin kho
              </Link>

              <Link
                to={`/admin/warehouses/${detailWarehouse.id}`}
                className="btn btn-secondary"
                style={{ flex: 1, textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600 }}
              >
                Trang chi tiết đầy đủ
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xóa kho hàng"
        message={`Bạn có chắc muốn xóa kho "${deleteTarget?.name}"? Thao tác này không thể hoàn tác.`}
        confirmText={deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
        cancelText="Hủy"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
}
