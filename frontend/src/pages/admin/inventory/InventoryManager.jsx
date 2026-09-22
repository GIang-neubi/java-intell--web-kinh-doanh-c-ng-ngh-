import { useEffect, useState, useCallback } from 'react';
import { Package, Plus, Save, X, Search, History, ArrowRight, Building2 } from 'lucide-react';
import { fetchProducts } from '../../../api/products';
import { importInventory, fetchInventoryLogs } from '../../../api/inventory';
import { fetchActiveWarehouses } from '../../../api/warehouses';
import { formatDate } from '../../../utils/helpers';
import { resolveImageUrl } from '../../../utils/imageUrl';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';

export default function InventoryManager() {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'history'

  // History State
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Import State
  const [items, setItems] = useState([]); // { productId, name, image, stock, quantity, note }
  const [generalNote, setGeneralNote] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Product Search State
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadLogs = useCallback(async (p = 0) => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const data = await fetchInventoryLogs({ page: p, size: 20 });
      setLogs(data.content || []);
      setTotalPages(data.totalPages || 0);
      setPage(data.number || 0);
    } catch (err) {
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveWarehouses()
      .then((data) => {
        setWarehouses(data || []);
        if (data && data.length > 0) {
          setSelectedWarehouseId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadLogs(0);
    }
  }, [activeTab, loadLogs]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSearching(true);
    try {
      const res = await fetchProducts({ keyword, pageNo: 0, pageSize: 10 });
      setSearchResults(res.content || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddItem = (product) => {
    if (items.some(item => item.productId === product.id)) return; // Already added
    setItems([...items, {
      productId: product.id,
      name: product.name,
      image: product.image,
      stock: product.stock,
      quantity: 1,
      note: ''
    }]);
    setKeyword('');
    setSearchResults([]);
  };

  const handleRemoveItem = (productId) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const handleQuantityChange = (productId, qty) => {
    setItems(items.map(item => 
      item.productId === productId ? { ...item, quantity: Math.max(1, qty) } : item
    ));
  };

  const handleNoteChange = (productId, note) => {
    setItems(items.map(item => 
      item.productId === productId ? { ...item, note } : item
    ));
  };

  const handleSubmitImport = async () => {
    if (items.length === 0) {
      setImportError('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }
    setSubmitting(true);
    setImportError('');
    setImportSuccess('');

    try {
      const reqData = {
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, note: i.note })),
        warehouseId: selectedWarehouseId ? Number(selectedWarehouseId) : null,
        generalNote
      };
      await importInventory(reqData);
      setImportSuccess('Nhập kho thành công!');
      setItems([]);
      setGeneralNote('');
    } catch (err) {
      setImportError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hg-admin-module">
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <Plus size={16} style={{ marginRight: 6 }} /> Tạo phiếu nhập
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} style={{ marginRight: 6 }} /> Lịch sử nhập kho
        </button>
      </div>

      {activeTab === 'import' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Sản phẩm nhập</h3>
            
            {importError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{importError}</div>}
            {importSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{importSuccess}</div>}

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <input
                className="form-input"
                placeholder="Tìm kiếm theo tên hoặc mã SP..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={searching}>
                <Search size={16} /> Tìm kiếm
              </button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ marginBottom: 24, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {searchResults.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
                        {p.image ? <img src={resolveImageUrl(p.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Package size={20} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tồn hiện tại: {p.stock}</div>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleAddItem(p)}
                      disabled={items.some(i => i.productId === p.id)}
                    >
                      {items.some(i => i.productId === p.id) ? 'Đã thêm' : 'Chọn'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: '#f9fafb', borderRadius: 8 }}>
                Chưa có sản phẩm nào trong phiếu nhập.
              </div>
            ) : (
              <div className="hg-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th style={{ width: 100 }}>Tồn kho</th>
                      <th style={{ width: 120 }}>Số lượng nhập</th>
                      <th>Ghi chú</th>
                      <th style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.productId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                              {item.image ? <img src={resolveImageUrl(item.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Package size={16} />}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</span>
                          </div>
                        </td>
                        <td>{item.stock}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            min="1"
                            style={{ padding: '6px 10px', height: 32 }}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.productId, Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Tùy chọn"
                            style={{ padding: '6px 10px', height: 32 }}
                            value={item.note}
                            onChange={(e) => handleNoteChange(item.productId, e.target.value)}
                          />
                        </td>
                        <td>
                          <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveItem(item.productId)}>
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

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Lưu phiếu nhập</h3>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={16} style={{ color: 'var(--primary, #3b82f6)' }} /> Kho nhập hàng
              </label>
              <select
                className="form-input"
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
              >
                <option value="">-- Chưa chọn kho --</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.warehouseCode} - {wh.name}
                  </option>
                ))}
              </select>
              <small style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                Chọn kho hàng tiếp nhận lô sản phẩm này
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú chung</label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="VD: Nhập hàng đợt 1 tháng 10..."
                value={generalNote}
                onChange={e => setGeneralNote(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px 0' }}
              disabled={submitting || items.length === 0}
              onClick={handleSubmitImport}
            >
              {submitting ? 'Đang xử lý...' : <><Save size={18} style={{ marginRight: 8 }} /> Xác nhận nhập kho</>}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="hg-card-head" style={{ padding: '20px 24px 0' }}>
            <h3>Lịch sử nhập/xuất kho</h3>
          </div>
          
          {logsLoading ? (
            <AdminLoading label="Đang tải lịch sử..." />
          ) : logsError ? (
            <AdminError message={logsError} onRetry={() => loadLogs(page)} />
          ) : logs.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              Chưa có lịch sử nhập kho nào.
            </div>
          ) : (
            <>
              <div className="hg-table-scroll" style={{ padding: '0 24px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Kho hàng</th>
                      <th>Loại</th>
                      <th>Số lượng</th>
                      <th>Người thực hiện</th>
                      <th>Thời gian</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                              {log.productImage ? <img src={resolveImageUrl(log.productImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Package size={16} />}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{log.productName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {log.productId}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {log.warehouseName ? (
                            <div>
                              <span style={{ fontWeight: 500 }}>{log.warehouseName}</span>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.warehouseCode}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${log.type === 'IMPORT' ? 'badge-new' : 'badge-danger'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: log.type === 'IMPORT' ? 'var(--success)' : 'var(--danger)' }}>
                          {log.type === 'IMPORT' ? '+' : '-'}{log.quantity}
                        </td>
                        <td style={{ fontSize: 13 }}>{log.createdBy}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(log.createdAt)}</td>
                        <td style={{ fontSize: 13 }}>{log.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="hg-pagination" style={{ padding: '20px 24px' }}>
                  <div className="hg-pagination-info">Trang {page + 1} / {totalPages}</div>
                  <div className="hg-pagination-actions">
                    <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => loadLogs(page - 1)}>
                      Trước
                    </button>
                    <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => loadLogs(page + 1)}>
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
