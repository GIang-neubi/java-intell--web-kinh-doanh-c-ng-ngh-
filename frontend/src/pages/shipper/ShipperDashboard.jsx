import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Package, MapPin, Phone, CheckCircle2, AlertCircle,
  Navigation, ChevronRight, DollarSign, ArrowRight,
  Bell, RefreshCw, Sparkles, Wallet, AlertTriangle
} from 'lucide-react';
import {
  fetchShipperDeliveries,
  shipperAcceptDelivery,
  shipperPickupPackage,
  fetchShipperCodSummary,
  fetchShipperStats
} from '../../api/delivery';
import { getErrorMessage } from '../../api/client';
import { formatPrice, formatDate, deliveryStatusLabel, deliveryStatusColor, shippingMethodLabel } from '../../utils/helpers';
import { getDeliveryNavigationStage } from '../../utils/navigation';
import { playDeliveryChime } from '../../utils/audio';

export default function ShipperDashboard() {
  const [activeTab, setActiveTab] = useState('ASSIGNED');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [newJobAlert, setNewJobAlert] = useState(null);
  const [codSummary, setCodSummary] = useState(null);
  const [stats, setStats] = useState(null);

  const assignedIdsRef = useRef(new Set());
  const initialLoadedRef = useRef(false);

  // Load deliveries
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      fetchShipperCodSummary()
        .then(setCodSummary)
        .catch(() => {});
      fetchShipperStats()
        .then(setStats)
        .catch(() => {});

      let statusParam = activeTab;
      if (activeTab === 'ALL_ACTIVE') statusParam = undefined;

      const data = await fetchShipperDeliveries({
        status: statusParam === 'ALL' ? undefined : (statusParam === 'HISTORY' ? undefined : statusParam),
        page: 0,
        size: 50,
      });

      let list = data.content || [];
      if (activeTab === 'IN_TRANSIT_GROUP') {
        list = list.filter((d) => ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(d.status));
      } else if (activeTab === 'HISTORY') {
        list = list.filter((d) => ['DELIVERED', 'DELIVERY_FAILED'].includes(d.status));
      } else if (activeTab === 'ASSIGNED') {
        list.forEach((d) => assignedIdsRef.current.add(d.id));
      }
      setItems(list);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách đơn hàng'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  // Polling tự động kiểm tra đơn hàng mới mỗi 7 giây
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetchShipperDeliveries({ status: 'ASSIGNED', page: 0, size: 20 });
        const list = res.content || [];

        if (!initialLoadedRef.current) {
          list.forEach((d) => assignedIdsRef.current.add(d.id));
          initialLoadedRef.current = true;
          return;
        }

        const newOrders = list.filter((d) => !assignedIdsRef.current.has(d.id));
        if (newOrders.length > 0) {
          const newest = newOrders[0];
          newOrders.forEach((d) => assignedIdsRef.current.add(d.id));

          playDeliveryChime('new_order');
          setNewJobAlert({
            id: newest.id,
            code: newest.orderCode,
            receiver: newest.receiverName,
            address: newest.deliveryAddress,
            fee: newest.shippingFee,
          });

          if (activeTab === 'ASSIGNED') {
            load();
          }
        }
      } catch (e) {
        // ignore polling error
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [activeTab, load]);

  const handleAccept = async (e, id, code) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading(id);
    try {
      await shipperAcceptDelivery(id);
      setToast(`Đã nhận đơn #${code}!`);
      setTimeout(() => setToast(''), 3000);
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Không thể nhận đơn'));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePickup = async (e, id, code) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading(id);
    try {
      await shipperPickupPackage(id);
      setToast(`Đã lấy gói hàng #${code}!`);
      setTimeout(() => setToast(''), 3000);
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Không thể xác nhận lấy hàng'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      {/* Live Online Bar */}
      <div className="hg-shipper-live-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.25)' }} />
          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Trực tuyến nhận đơn</span>
        </div>
        <button
          type="button"
          onClick={load}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
            padding: '6px 10px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer'
          }}
          title="Làm mới danh sách"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Real-time Shipper KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hôm nay</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#0a3d8f', marginTop: '2px' }}>{stats?.todayAssigned ?? 0}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Đang giao</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{stats?.inTransit ?? 0}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Thành công</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>{stats?.delivered ?? 0}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Thất bại</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>{stats?.failed ?? 0}</div>
        </div>
      </div>

      {/* Shipper COD Cash Collection Widget */}
      {codSummary && (
        <div className="hg-shipper-wallet-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '10px',
                background: '#f59e0b', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.25)'
              }}>
                <Wallet size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400e' }}>
                  Ví tiền mặt COD thu hộ
                </div>
                <div style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
                  {Number(codSummary.pendingCodOrders || 0) > 0
                    ? `Đang giữ tiền ${codSummary.pendingCodOrders} đơn hàng`
                    : 'Đã hoàn tất nộp quỹ'}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: '#92400e', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Tiền cần nộp shop
              </span>
              <span style={{
                fontSize: '18px', fontWeight: 900,
                color: Number(codSummary.pendingCodAmount || 0) > 0 ? '#b45309' : '#047857'
              }}>
                {formatPrice(codSummary.pendingCodAmount || 0)}
              </span>
            </div>
          </div>

          <div style={{
            marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(245, 158, 11, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
            fontSize: '11px', color: '#78350f'
          }}>
            <div>
              Đã thu: <strong>{formatPrice(codSummary.totalCodCollected || 0)}</strong> · Nộp: <strong>{formatPrice(codSummary.totalCodSettled || 0)}</strong>
            </div>
            {Number(codSummary.pendingCodAmount || 0) > 0 ? (
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '10px' }}>
                Nộp quỹ cuối ca
              </span>
            ) : (
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '10px' }}>
                Quỹ cân bằng
              </span>
            )}
          </div>
        </div>
      )}

      {/* New Job Alert Banner */}
      {newJobAlert && (
        <div style={{
          background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
          color: '#ffffff', borderRadius: '16px', padding: '16px', marginBottom: '16px',
          boxShadow: '0 6px 20px rgba(234, 88, 12, 0.3)', position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Bell size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} style={{ color: '#fef08a' }} />
                <span>CÓ ĐƠN HÀNG MỚI ĐƯỢC GÁN!</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.95, lineHeight: 1.3 }}>
                Đơn #{newJobAlert.code} · Khách: {newJobAlert.receiver}
              </p>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ASSIGNED');
                    setNewJobAlert(null);
                    load();
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', background: '#ffffff',
                    color: '#ea580c', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  Xem ngay
                </button>
                <button
                  type="button"
                  onClick={() => setNewJobAlert(null)}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', background: 'transparent',
                    color: '#ffffff', border: 'none', fontSize: '12px', cursor: 'pointer', opacity: 0.8
                  }}
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div style={{
          background: '#059669', color: '#ffffff', borderRadius: '12px', padding: '12px 16px',
          marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast('')}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Segmented Control Tabs */}
      <div className="hg-shipper-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('ASSIGNED')}
          className={`hg-shipper-tab-btn ${activeTab === 'ASSIGNED' ? 'active' : ''}`}
        >
          Chờ nhận
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SHIPPER_ACCEPTED')}
          className={`hg-shipper-tab-btn ${activeTab === 'SHIPPER_ACCEPTED' ? 'active' : ''}`}
        >
          Cần lấy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('IN_TRANSIT_GROUP')}
          className={`hg-shipper-tab-btn ${activeTab === 'IN_TRANSIT_GROUP' ? 'active' : ''}`}
        >
          Đang giao
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`hg-shipper-tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
        >
          Lịch sử
        </button>
      </div>

      {/* Content list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px', width: 24, height: 24 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Đang tải danh sách đơn hàng...</div>
        </div>
      ) : error ? (
        <div style={{
          background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '14px',
          padding: '16px', color: '#9f1239', fontSize: '13px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'
        }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={load}
            style={{ background: 'none', border: 'none', color: '#e11d48', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', background: '#f8fafc',
          borderRadius: '16px', border: '1px dashed #cbd5e1'
        }}>
          <Package size={44} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Không có đơn hàng nào
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Chưa có đơn ở trạng thái này hoặc bạn đã xử lý xong.
          </p>
        </div>
      ) : (
        <div>
          {items.map((d) => {
            const statusStyle = deliveryStatusColor[d.status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
            const isProcessing = actionLoading === d.id;

            return (
              <div key={d.id} className="hg-shipper-order-card">
                {/* Header card */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/shipper/deliveries/${d.id}`}
                      style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#0a3d8f', textDecoration: 'none' }}
                    >
                      #{d.orderCode}
                    </Link>
                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                      DL#{d.id}
                    </span>
                    <span style={{
                      fontSize: '11px', padding: '1px 6px', borderRadius: '4px',
                      background: '#f1f5f9', color: '#475569', fontWeight: 600
                    }}>
                      {shippingMethodLabel[d.shippingMethod] || d.shippingMethod}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                    background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border || statusStyle.bg}`
                  }}>
                    {deliveryStatusLabel[d.status] || d.statusDescription || d.status}
                  </span>
                </div>

                {/* Warehouse Origin Note */}
                {d.warehouseName && (
                  <div style={{ fontSize: '11px', color: '#0369a1', marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Package size={13} />
                    <span>Kho lấy hàng: {d.warehouseName} ({d.warehouseCode || 'WH'})</span>
                  </div>
                )}

                {/* Re-delivery attempt alert for shipper */}
                {d.deliveryAttempts > 1 && (
                  <div style={{
                    background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px',
                    padding: '8px 12px', fontSize: '12px', color: '#92400e', marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                      <AlertTriangle size={14} style={{ color: '#d97706' }} />
                      <span>Đơn giao lại lần {d.deliveryAttempts}/3</span>
                    </div>
                    {d.reAttemptNote && (
                      <div style={{ fontSize: '11px', marginTop: '2px', fontStyle: 'italic' }}>
                        Lưu ý: &ldquo;{d.reAttemptNote}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {/* Receiver Info */}
                <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {d.receiverName}
                    </span>
                    {d.receiverPhone && (
                      <a
                        href={`tel:${d.receiverPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '8px',
                          background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                          fontSize: '12px', fontWeight: 700, textDecoration: 'none'
                        }}
                      >
                        <Phone size={12} />
                        <span>{d.receiverPhone}</span>
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.3 }}>
                    <MapPin size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                    <span>{d.deliveryAddress}</span>
                  </div>
                </div>

                {/* COD Cash to collect */}
                <div style={{
                  padding: '10px 0', borderTop: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                      CẦN THU TIỀN MẶT COD
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 900, color: '#b45309' }}>
                      {formatPrice(d.orderTotalAmount || 0)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      to={`/shipper/deliveries/${d.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '6px 12px', borderRadius: '8px',
                        background: '#0a3d8f', color: '#ffffff',
                        fontSize: '12px', fontWeight: 700, textDecoration: 'none'
                      }}
                    >
                      <span>Chi tiết</span>
                      <ArrowRight size={13} />
                    </Link>

                    {(() => {
                      const navStage = getDeliveryNavigationStage(d);
                      if (!navStage?.navUrl) return null;
                      const isPre = navStage.isBeforePickup;
                      return (
                        <a
                          href={navStage.navUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={navStage.title}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '6px 10px', borderRadius: '8px',
                            background: isPre ? '#eff6ff' : '#ecfdf5',
                            color: isPre ? '#1d4ed8' : '#047857',
                            border: `1px solid ${isPre ? '#bfdbfe' : '#a7f3d0'}`,
                            fontSize: '12px', fontWeight: 600, textDecoration: 'none'
                          }}
                        >
                          <Navigation size={13} style={{ color: isPre ? '#2563eb' : '#059669' }} />
                          <span style={{ fontSize: '11px', fontWeight: 700 }}>
                            {isPre ? 'Kho' : 'Khách'}
                          </span>
                        </a>
                      );
                    })()}
                  </div>
                </div>

                {/* Action Buttons based on status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px' }}>
                  {d.status === 'ASSIGNED' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => handleAccept(e, d.id, d.orderCode)}
                      className="hg-shipper-btn-primary accept"
                    >
                      <CheckCircle2 size={16} />
                      <span>{isProcessing ? 'Đang xử lý...' : 'NHẬN ĐƠN HÀNG NÀY'}</span>
                    </button>
                  )}

                  {d.status === 'SHIPPER_ACCEPTED' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => handlePickup(e, d.id, d.orderCode)}
                      className="hg-shipper-btn-primary pickup"
                    >
                      <Package size={16} />
                      <span>{isProcessing ? 'Đang xác nhận...' : 'ĐÃ LẤY HÀNG TỪ KHO'}</span>
                    </button>
                  )}

                  {['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(d.status) && (
                    <Link
                      to={`/shipper/${d.id}`}
                      className="hg-shipper-btn-primary deliver"
                    >
                      <span>TIẾN HÀNH GIAO HÀNG</span>
                      <ArrowRight size={15} />
                    </Link>
                  )}

                  <Link
                    to={`/shipper/${d.id}`}
                    style={{
                      width: 42, height: 42, borderRadius: '12px',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none', flexShrink: 0
                    }}
                    title="Chi tiết đơn"
                  >
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
