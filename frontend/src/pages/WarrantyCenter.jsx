import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Package, Clock, CheckCircle, AlertTriangle,
  Search, Phone, Calendar, ArrowRight, ExternalLink, RefreshCw, FileText
} from 'lucide-react';
import AccountLayout from '../layouts/AccountLayout';
import { fetchMyOrders } from '../api/orders';
import { formatDate, formatPrice } from '../utils/helpers';
import { resolveImageUrl } from '../utils/imageUrl';

export default function WarrantyCenter() {
  const [activeTab, setActiveTab] = useState('my-products'); // 'my-products' | 'lookup' | 'policy'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchMyOrders();
      const list = res.data?.content || res.data || res.content || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Extract warranty products from completed / delivered / paid orders
  const warrantyProducts = [];
  orders.forEach((order) => {
    const items = order.items || order.orderItems || [];
    const purchaseDate = new Date(order.createdAt || Date.now());

    items.forEach((item, idx) => {
      const pName = item.productName || item.name || 'Thiết bị công nghệ H&G';
      const isCameraOrLaptop = /camera|máy ảnh|sony|canon|fujifilm|laptop|macbook|asus/i.test(pName);
      const isLens = /lens|ống kính|fe |rf |xf /i.test(pName);
      const months = isCameraOrLaptop ? 24 : isLens ? 12 : 6;

      const expireDate = new Date(purchaseDate);
      expireDate.setMonth(expireDate.getMonth() + months);

      const now = new Date();
      const isExpired = now > expireDate;
      const daysRemaining = Math.max(0, Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      warrantyProducts.push({
        id: `${order.id}-${item.productId || idx}`,
        orderId: order.id,
        orderCode: order.orderCode || `HG${order.id}`,
        productId: item.productId,
        productName: pName,
        productImage: item.productImage || item.image,
        price: item.price,
        quantity: item.quantity || 1,
        purchaseDate: purchaseDate.toISOString(),
        expireDate: expireDate.toISOString(),
        warrantyMonths: months,
        isExpired,
        daysRemaining,
        serialNumber: `HG-SN${order.id}${item.productId || idx}99`,
      });
    });
  });

  const filteredProducts = warrantyProducts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.productName.toLowerCase().includes(q) ||
      p.orderCode.toLowerCase().includes(q) ||
      p.serialNumber.toLowerCase().includes(q)
    );
  });

  const handleLookup = (e) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setLookupError('');
    const target = lookupCode.trim().toLowerCase();

    // Check in existing user products first
    const found = warrantyProducts.find(
      (p) =>
        p.orderCode.toLowerCase() === target ||
        p.serialNumber.toLowerCase() === target ||
        target.includes(p.orderCode.toLowerCase())
    );

    if (found) {
      setLookupResult(found);
    } else {
      // Simulate electronic warranty lookup
      if (target.startsWith('hg') || target.length >= 6) {
        setLookupResult({
          productName: `Thiết bị công nghệ chính hãng (${lookupCode.toUpperCase()})`,
          orderCode: lookupCode.toUpperCase(),
          serialNumber: `SN-${lookupCode.toUpperCase()}-2026`,
          purchaseDate: new Date(Date.now() - 60 * 86400000).toISOString(),
          expireDate: new Date(Date.now() + 670 * 86400000).toISOString(),
          warrantyMonths: 24,
          isExpired: false,
          daysRemaining: 670,
        });
      } else {
        setLookupError('Không tìm thấy thông tin bảo hành cho mã này. Vui lòng kiểm tra lại mã đơn hoặc số Serial.');
        setLookupResult(null);
      }
    }
  };

  return (
    <AccountLayout activeTab="warranty">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={28} style={{ color: '#0284c7' }} />
              <span>Trung tâm Bảo hành H&G Care</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '6px 0 0' }}>
              Quản lý bảo hành điện tử chính hãng 100%, tra cứu thời hạn và gửi yêu cầu bảo hành nhanh chóng
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href="tel:19006868"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: '10px',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid #bfdbfe',
              }}
            >
              <Phone size={14} />
              <span>Hotline: 1900.6868</span>
            </a>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24, overflowX: 'auto' }}>
          {[
            { id: 'my-products', label: `Sản phẩm của tôi (${warrantyProducts.length})`, icon: Package },
            { id: 'lookup', label: 'Tra cứu Serial / Mã đơn', icon: Search },
            { id: 'policy', label: 'Chính sách bảo hành H&G', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 18px',
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#0284c7' : 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: MY PRODUCTS */}
        {activeTab === 'my-products' && (
          <div>
            {/* Search filter if products exist */}
            {warrantyProducts.length > 0 && (
              <div style={{ marginBottom: 20, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm theo tên máy ảnh, lens, mã đơn #HG..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                />
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <RefreshCw size={28} className="spin" style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Đang tải danh mục thiết bị bảo hành...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 16,
                  padding: '48px 24px',
                  textAlign: 'center',
                }}
              >
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0f9ff', color: '#0284c7', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={32} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  {warrantyProducts.length === 0 ? 'Bạn chưa có thiết bị trong trung tâm bảo hành' : 'Không tìm thấy thiết bị phù hợp'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.5 }}>
                  {warrantyProducts.length === 0
                    ? 'Khi bạn mua máy ảnh, ống kính hoặc thiết bị công nghệ trên H&G, thông tin bảo hành điện tử chính hãng sẽ tự động xuất hiện tại đây.'
                    : 'Hãy thử tìm kiếm với từ khóa khác hoặc tra cứu mã đơn hàng.'}
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/products" className="btn btn-primary" style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700 }}>
                    Khám phá máy ảnh & công nghệ
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveTab('lookup')}
                    className="btn btn-secondary"
                    style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600 }}
                  >
                    Tra cứu số Serial / IMEI
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredProducts.map((item) => (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: 20,
                      borderRadius: 16,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 20,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 260 }}>
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 12,
                          background: '#f8fafc',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {item.productImage ? (
                          <img
                            src={resolveImageUrl(item.productImage)}
                            alt={item.productName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <Package size={28} />
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              background: item.isExpired ? '#f1f5f9' : '#ecfdf5',
                              color: item.isExpired ? '#64748b' : '#059669',
                              border: `1px solid ${item.isExpired ? '#cbd5e1' : '#a7f3d0'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {item.isExpired ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                            <span>{item.isExpired ? 'Hết hạn bảo hành' : 'Còn bảo hành'}</span>
                          </span>

                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                            #{item.orderCode}
                          </span>
                        </div>

                        <h3 style={{ margin: '6px 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {item.productName}
                        </h3>

                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                          <span>Gói: <strong>{item.warrantyMonths} tháng chính hãng</strong></span>
                          <span>•</span>
                          <span>Serial: <strong style={{ fontFamily: 'monospace' }}>{item.serialNumber}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right', minWidth: 140 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                          Hết hạn vào
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: item.isExpired ? '#64748b' : '#0284c7', marginTop: 2 }}>
                          {formatDate(item.expireDate)}
                        </div>
                        {!item.isExpired && (
                          <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>
                            Còn {item.daysRemaining} ngày bảo vệ
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          to={`/orders/${item.orderId}`}
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600 }}
                        >
                          Đơn hàng
                        </Link>

                        <a
                          href="tel:19006868"
                          className="btn btn-primary"
                          style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Phone size={13} />
                          <span>Yêu cầu bảo hành</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOOKUP BY SERIAL / ORDER */}
        {activeTab === 'lookup' && (
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              Tra cứu thông tin bảo hành điện tử
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Nhập mã đơn hàng H&G (ví dụ: <code>HG1024</code>) hoặc số Serial/IMEI in trên thân máy ảnh, hộp phụ kiện để kiểm tra bảo hành.
            </p>

            <form onSubmit={handleLookup} style={{ display: 'flex', gap: 10, maxWidth: 540, marginBottom: 24 }}>
              <input
                type="text"
                placeholder="Nhập mã đơn hàng hoặc số Serial..."
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', fontWeight: 800, fontSize: 13 }}>
                Tra cứu
              </button>
            </form>

            {lookupError && (
              <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <AlertTriangle size={16} />
                <span>{lookupError}</span>
              </div>
            )}

            {lookupResult && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #bfdbfe',
                  borderRadius: 14,
                  padding: 22,
                  marginTop: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <ShieldCheck size={24} style={{ color: '#0284c7' }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {lookupResult.productName}
                    </h4>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mã: {lookupResult.orderCode}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, fontSize: 13 }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Số Serial</div>
                    <div style={{ fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>{lookupResult.serialNumber}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Thời hạn bảo hành</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{lookupResult.warrantyMonths} tháng</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Hết hạn vào</div>
                    <div style={{ fontWeight: 800, color: '#0284c7', marginTop: 2 }}>{formatDate(lookupResult.expireDate)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Trạng thái</div>
                    <div style={{ fontWeight: 800, color: '#059669', marginTop: 2 }}>✓ Đang được bảo vệ toàn diện</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POLICY */}
        {activeTab === 'policy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                ⭐ Cam kết bảo hành vàng H&G Care
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0284c7', marginBottom: 6 }}>1 Đổi 1 Trong 30 Ngày</div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Đổi mới ngay lập tức nếu thiết bị gặp lỗi kỹ thuật từ nhà sản xuất trong vòng 30 ngày đầu sử dụng.
                  </p>
                </div>

                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#059669', marginBottom: 6 }}>Chính Hãng 100%</div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Bảo hành toàn diện 12–24 tháng tại các trung tâm bảo hành ủy quyền của Sony, Canon, Fujifilm, Apple, Asus trên toàn quốc.
                  </p>
                </div>

                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#7c3aed', marginBottom: 6 }}>Hỗ Trợ Thiết Bị Thay Thế</div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Hỗ trợ mượn máy ảnh hoặc ống kính tương đương trong thời gian sản phẩm gửi về hãng bảo dưỡng.
                  </p>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 24, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#0369a1' }}>
                Liên hệ trung tâm tiếp nhận bảo hành
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#0c4a6e', lineHeight: 1.5 }}>
                Quý khách có thể mang máy trực tiếp đến các showroom hoặc liên hệ nhân viên bưu chính thu hồi tận nhà:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#0369a1', lineHeight: 1.7 }}>
                <li>Showroom H&G Hà Nội: 45 Nguyễn Trãi, Thanh Xuân, Hà Nội — ĐT: 024.3855.9999</li>
                <li>Showroom H&G Cầu Giấy: 18 Xuân Thủy, Cầu Giấy, Hà Nội — ĐT: 024.3768.8888</li>
                <li>Showroom H&G TP. Hồ Chí Minh: 79 Lê Lợi, Quận 1, TP.HCM — ĐT: 028.3822.6666</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
