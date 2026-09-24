import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, CreditCard, CheckCircle, Tag, X, Clock, Copy, CheckCircle2,
  ChevronRight, Truck, Zap, BookOpen, Plus, Star, Ticket, ShoppingBag
} from 'lucide-react';
import { useCartStore, useAuthStore } from '../store';
import { formatPrice, formatDate } from '../utils/helpers';
import api, { getErrorMessage } from '../api/client';
import { resolveImageUrl } from '../utils/imageUrl';
import { getShippingMethods, checkoutPreview } from '../api/shipping';
import { fetchAddresses, createAddress } from '../api/addresses';

// ─── Thông tin ngân hàng ───────────────────────────────────────────────────
const BANK_INFO = {
  accountNumber: '7690152904691',
  accountName:   'NGUYEN TRUONG GIANG',
  bankShort:     'MB',
  bankName:      'Ngân hàng TMCP Quân Đội (MB Bank)',
};

/** Tạo URL QR VietQR từ thông tin ngân hàng */
function buildQrUrl(amount, content) {
  const params = new URLSearchParams({
    amount:        String(amount),
    addInfo:       content,
    accountName:   BANK_INFO.accountName,
  });
  return `https://img.vietqr.io/image/${BANK_INFO.bankShort}-${BANK_INFO.accountNumber}-compact2.png?${params}`;
}

export default function Checkout() {
  const { clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const navigate             = useNavigate();

  const [payment, setPayment] = useState('COD');
  const [form, setForm]       = useState({
    fullName: user?.fullName || '',
    phone:    user?.phone    || '',
    address:  '',
    note:     '',
  });
  const [placing, setPlacing] = useState(false);
  const [error, setError]     = useState('');

  // Sau khi đặt hàng thành công — banking cần chờ xác nhận
  const [placedOrder, setPlacedOrder]   = useState(null);  // OrderDTO
  const [copied, setCopied]             = useState(false);
  const [pollError, setPollError]       = useState('');

  // Voucher
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);

  // ── Vận chuyển (Shipping) ──
  const [shippingMethod, setShippingMethod] = useState('STANDARD');
  const [shippingMethods, setShippingMethods] = useState([
    { shippingMethod: 'STANDARD', displayName: 'Giao hàng tiêu chuẩn', shippingFee: 20000, estimatedDelivery: '2–4 ngày', description: 'Giao hàng qua mạng lưới bưu cục H&G' },
    { shippingMethod: 'EXPRESS', displayName: 'Giao hàng nhanh', shippingFee: 30000, estimatedDelivery: '1–2 ngày', description: 'Giao hàng ưu tiên đường bay/hỏa tốc' },
    { shippingMethod: 'SAME_DAY', displayName: 'Giao hỏa tốc trong ngày', shippingFee: 50000, estimatedDelivery: 'Trong ngày', description: 'Giao nhanh bằng shipper nội thành 2-4 giờ' },
  ]);

  // Dữ liệu tính toán từ Backend (Single Source of Truth)
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const displayItems = useCartStore((s) => s.items);

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);
  const [saveToAddresses, setSaveToAddresses] = useState(false);

  // Gọi API xem trước chi phí từ Backend
  const requestCheckoutPreview = async (method = shippingMethod, vCode = appliedVoucherCode, addr = form.address) => {
    const currentItems = useCartStore.getState().items;
    if (!currentItems || currentItems.length === 0) return;

    setPreviewLoading(true);
    try {
      // Đồng bộ giỏ hàng lên server trước khi tính toán
      await api.delete('/cart/clear');
      await Promise.all(currentItems.map((item) => api.post('/cart/items', {
        productId: item.id,
        quantity: item.quantity,
      })));

      const data = await checkoutPreview({
        shippingMethod: method,
        voucherCode: vCode ? vCode.trim() : null,
        shippingAddress: (addr || '').trim() || null,
      });

      setPreviewData(data);
      if (vCode) {
        if (data.voucherValid) {
          setVoucherError('');
        } else {
          setVoucherError(data.voucherMessage || 'Mã giảm giá không hợp lệ');
        }
      }
    } catch (err) {
      console.warn('Lỗi xem trước đơn hàng:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Tải danh sách địa chỉ đã lưu của khách hàng
  useEffect(() => {
    fetchAddresses()
      .then((addrs) => {
        if (addrs && addrs.length > 0) {
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            const initialAddr = defaultAddr.fullAddress || defaultAddr.detailAddress || '';
            setForm((prev) => ({
              ...prev,
              fullName: prev.fullName || defaultAddr.recipientName || '',
              phone: prev.phone || defaultAddr.phone || '',
              address: prev.address || initialAddr,
            }));
            requestCheckoutPreview(shippingMethod, appliedVoucherCode, initialAddr);
          }
        }
      })
      .catch((err) => console.warn('Không tải được sổ địa chỉ:', err));
  }, []);

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr.id);
    const addrText = addr.fullAddress || addr.detailAddress || '';
    setForm((prev) => ({
      ...prev,
      fullName: addr.recipientName || prev.fullName,
      phone: addr.phone || prev.phone,
      address: addrText,
    }));
    setShowAddressDrawer(false);
    requestCheckoutPreview(shippingMethod, appliedVoucherCode, addrText);
  };

  useEffect(() => {
    let active = true;
    const clientSubtotal = displayItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const clientWeight = displayItems.reduce((s, i) => s + ((i.weightKg || 0) * (i.quantity || 1)), 0);

    getShippingMethods({ orderAmount: clientSubtotal, totalWeightKg: clientWeight > 0 ? clientWeight : null })
      .then((methods) => {
        if (active && methods && methods.length > 0) {
          setShippingMethods(methods);
        }
      })
      .catch((err) => console.warn('Không tải được phương thức vận chuyển:', err));

    requestCheckoutPreview(shippingMethod, appliedVoucherCode);
    return () => { active = false; };
  }, [displayItems.length]);

  // Khi đổi phương thức vận chuyển -> Gọi Backend tính lại cước ngay
  const handleShippingChange = (newMethod) => {
    setShippingMethod(newMethod);
    requestCheckoutPreview(newMethod, appliedVoucherCode);
  };

  // Đơn vị tiền tệ chính thức: Ưu tiên Backend calculation
  const subtotal     = previewData ? previewData.subtotal : displayItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const discount     = previewData ? previewData.discountAmount : 0;
  const currentShipping = shippingMethods.find((m) => m.shippingMethod === shippingMethod) || shippingMethods[0];
  const shippingFee  = previewData ? previewData.shippingFee : (currentShipping?.shippingFee || 20000);
  const finalTotal   = previewData ? previewData.totalAmount : Math.max(subtotal - discount, 0) + shippingFee;

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/vouchers/available')
        .then(({ data }) => {
          if (data.success && Array.isArray(data.data)) {
            setAvailableVouchers(data.data);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // ── Áp dụng voucher qua Backend ──
  const applyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    setVoucherLoading(true); setVoucherError('');
    try {
      setAppliedVoucherCode(code);
      await requestCheckoutPreview(shippingMethod, code);
    } catch (err) {
      setVoucherError(getErrorMessage(err, 'Mã giảm giá không hợp lệ'));
    } finally {
      setVoucherLoading(false); 
    }
  };

  const applyVoucherCode = async (code) => {
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();
    setVoucherInput(cleanCode);
    setVoucherLoading(true);
    setVoucherError('');
    setVoucherModalOpen(false);
    try {
      setAppliedVoucherCode(cleanCode);
      await requestCheckoutPreview(shippingMethod, cleanCode);
    } catch (err) {
      setVoucherError(getErrorMessage(err, 'Mã giảm giá không hợp lệ'));
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = async () => {
    setAppliedVoucherCode('');
    setVoucherInput('');
    setVoucherError('');
    await requestCheckoutPreview(shippingMethod, '');
  };

  // ── Copy nội dung chuyển khoản ──
  const copyTransferContent = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Poll kiểm tra thanh toán ──
  useEffect(() => {
    if (!placedOrder || placedOrder.paymentMethod !== 'BANKING') return;
    if (placedOrder.paymentStatus === 'PAID') return;

    console.log('[Poll] Started for order', placedOrder.orderCode);
    const interval = setInterval(async () => {
      try {
        console.log('[Poll] GET /api/orders/me/', placedOrder.id);
        const { data } = await api.get(`/orders/me/${placedOrder.id}`);
        console.log('[Poll] Response:', data.success, 'status=', data.data?.paymentStatus);
        if (data.success && data.data.paymentStatus === 'PAID') {
          console.log('[Poll] ✅ PAID confirmed');
          setPlacedOrder(data.data);
          clearInterval(interval);
        } else if (data.success) {
          console.log('[Poll] Still:', data.data?.paymentStatus);
        } else {
          console.log('[Poll] ❌ API error:', data.message);
        }
      } catch (err) {
        console.log('[Poll] ❌ Request failed:', err.message);
        setPollError('Kết nối thất bại — kiểm tra lại máy chủ.');
      }
    }, 5000);

    return () => { console.log('[Poll] Cleared'); clearInterval(interval); };
  }, [placedOrder]);

  // ── Auto redirect sau khi PAID ──
  useEffect(() => {
    if (!placedOrder) return;
    if (placedOrder.paymentMethod === 'BANKING' && placedOrder.paymentStatus === 'PAID') {
      console.log('[Redirect] PAID — navigating to /orders in 3s');
      const timer = setTimeout(() => navigate('/orders'), 3000);
      return () => { clearTimeout(timer); console.log('[Redirect] Cancelled'); };
    }
  }, [placedOrder, navigate]);

  // ── Đặt hàng ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentItems = useCartStore.getState().items;
    if (!currentItems || currentItems.length === 0) {
      setError('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.');
      return;
    }
    if (!form.fullName.trim())     { setError('Vui lòng nhập họ tên'); return; }
    if (!form.phone.trim())        { setError('Vui lòng nhập số điện thoại'); return; }
    if (!form.address.trim())      { setError('Vui lòng nhập địa chỉ giao hàng'); return; }

    setPlacing(true); setError('');
    try {
      console.log('[Checkout] POST /api/orders/checkout', { paymentMethod: payment, voucherCode: appliedVoucherCode || null, shippingMethod });
      await api.delete('/cart/clear');
      await Promise.all(currentItems.map((item) => api.post('/cart/items', {
        productId: item.id,
        quantity: item.quantity,
      })));

      const { data } = await api.post('/orders/checkout', {
        shippingAddress: form.address.trim(),
        phone:           form.phone.trim(),
        paymentMethod:   payment,
        voucherCode:     appliedVoucherCode || null,
        shippingMethod:  shippingMethod,
      });
      console.log('[Checkout] Response:', data.success, 'order=', data.data?.orderCode);
      if (data.success) {
        if (saveToAddresses && form.address.trim()) {
          createAddress({
            recipientName: form.fullName.trim(),
            phone: form.phone.trim(),
            detailAddress: form.address.trim(),
            isDefault: savedAddresses.length === 0,
          }).catch((err) => console.warn('Lỗi tự động lưu địa chỉ mới:', err));
        }

        clearCart();
        setPlacedOrder(data.data);
        if (payment === 'COD') {
          setTimeout(() => navigate('/orders'), 3000);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Đặt hàng thất bại. Vui lòng thử lại.'));
    } finally {
      setPlacing(false);
    }
  };

  // ────────────────────────────────────────────────
  // TRẠNG THÁI 1: Đặt hàng COD thành công
  // ────────────────────────────────────────────────
  if (placedOrder && placedOrder.paymentMethod === 'COD') {
    return (
      <main className="page-content" style={{ background: 'var(--bg)' }}>
        <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
          <CheckCircle size={80} style={{ color: 'var(--success)', margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Đặt hàng thành công!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
            Mã đơn: <strong style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>{placedOrder.orderCode}</strong>
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Đang chuyển hướng đến đơn hàng của bạn...</p>
          <div className="spinner" style={{ margin: '24px auto 0' }} />
        </div>
      </main>
    );
  }

  // ────────────────────────────────────────────────
  // TRẠNG THÁI 2: Đặt hàng BANKING — hiển thị QR chờ TT
  // ────────────────────────────────────────────────
  if (placedOrder && placedOrder.paymentMethod === 'BANKING') {
    const isPaid = placedOrder.paymentStatus === 'PAID';
    const qrUrl  = buildQrUrl(placedOrder.totalAmount, placedOrder.transferContent);

    return (
      <main className="page-content" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ maxWidth: 600, margin: '40px auto', padding: '0 24px' }}>
          {isPaid ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle size={80} style={{ color: 'var(--success)', margin: '0 auto 20px' }} />
              <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)', marginBottom: 8, letterSpacing: '-0.02em' }}>Thanh toán thành công!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Đơn <strong>{placedOrder.orderCode}</strong> đã được xác nhận.</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Đang chuyển hướng đến đơn hàng của bạn...</p>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <button 
                className="btn btn-primary" 
                style={{ padding: '12px 24px', borderRadius: 'var(--radius-full)' }} 
                onClick={() => navigate('/orders')}
              >
                Xem đơn hàng ngay
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, background: '#fef3c7', color: '#92400e', padding: '8px 16px', borderRadius: 'var(--radius-full)' }}>
                  <Clock size={16} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Chờ thanh toán</span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
                  Hoàn tất thanh toán
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Mã đơn: <strong style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>{placedOrder.orderCode}</strong>
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hệ thống sẽ kiểm tra thanh toán mỗi 5 giây...</p>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                {/* QR Code VietQR */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📱 Quét QR để thanh toán
                  </div>
                  <img
                    src={qrUrl}
                    alt="QR thanh toán"
                    style={{ width: 240, height: 240, border: '1px solid var(--border)', borderRadius: 16, margin: '0 auto', display: 'block', padding: 8, background: 'var(--bg-card)' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>Hỗ trợ tất cả ứng dụng ngân hàng (VietQR)</p>
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '0 0 24px 0' }} />

                {/* Thông tin chuyển khoản */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Hoặc chuyển khoản thủ công
                  </div>
                  {[
                    ['Ngân hàng',             BANK_INFO.bankName],
                    ['Số tài khoản',   BANK_INFO.accountNumber],
                    ['Chủ tài khoản',     BANK_INFO.accountName],
                    ['Số tiền',           formatPrice(placedOrder.totalAmount)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{label}</span>
                      <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value}</strong>
                    </div>
                  ))}

                  {/* Nội dung chuyển khoản - quan trọng nhất */}
                  <div style={{ marginTop: 24, padding: 20, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Nội dung chuyển khoản (Bắt buộc)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: 'var(--primary)', letterSpacing: 1 }}>
                        {placedOrder.transferContent}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyTransferContent(placedOrder.transferContent)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, 
                          color: copied ? 'var(--success)' : 'var(--text-primary)',
                          cursor: 'pointer', transition: 'all .2s'
                        }}>
                        {copied ? <><CheckCircle2 size={14} /> Đã sao chép</> : <><Copy size={14} /> Sao chép</>}
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                      Bắt buộc nhập đúng nội dung này để hệ thống tự động xác nhận.
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 32, textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14, background: '#f9fafb', padding: '10px 20px', borderRadius: 'var(--radius-full)' }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Đang chờ xác nhận thanh toán...
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <button type="button" style={{ fontSize: 14, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/orders')}>
                      Quay lại đơn hàng
                    </button>
                  </div>
                  {pollError && (
                    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--danger)', background: '#fef2f2', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid #fecaca' }}>
                      {pollError}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  // ────────────────────────────────────────────────
  // TRẠNG THÁI 3: Giỏ hàng trống
  // ────────────────────────────────────────────────
  if (displayItems.length === 0 && !placedOrder) {
    return (
      <main className="page-content" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <ShoppingBag size={40} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>Giỏ hàng của bạn đang trống</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
              Vui lòng thêm sản phẩm vào giỏ hàng trước khi tiến hành thanh toán.
            </p>
            <Link to="/products" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 'var(--radius-full)' }}>
              Khám phá sản phẩm <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ────────────────────────────────────────────────
  // Form checkout bình thường
  // ────────────────────────────────────────────────
  return (
    <main className="page-content" style={{ background: 'var(--bg)' }}>
      <div className="container">
        
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'var(--space-6) 0', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}>Trang chủ</Link>
          <ChevronRight size={12} />
          <Link to="/cart" style={{ color: 'var(--text-muted)' }}>Giỏ hàng</Link>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Thanh toán</span>
        </nav>

        <form onSubmit={handleSubmit}>
          <div className="checkout-layout">
            
            {/* ── LEFT: Form ── */}
            <div>
              {error && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
                  {error}
                </div>
              )}

              {/* Thông tin giao hàng */}
              <div className="checkout-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  <div className="checkout-section-title" style={{ margin: 0 }}>
                    <MapPin size={20} /> Thông tin giao hàng
                  </div>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddressDrawer(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#eff6ff',
                        color: 'var(--primary)',
                        border: '1px solid #bfdbfe',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#eff6ff'}
                    >
                      <BookOpen size={14} />
                      <span>Chọn từ sổ địa chỉ ({savedAddresses.length})</span>
                    </button>
                  )}
                </div>

                {/* Selected address indicator */}
                {selectedAddressId && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    fontSize: '12px',
                    color: '#166534'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} color="#16a34a" />
                      <span>Đang dùng địa chỉ lưu từ sổ địa chỉ của bạn</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddressDrawer(true)}
                      style={{ background: 'none', border: 'none', color: '#166534', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                    >
                      Đổi địa chỉ
                    </button>
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Họ tên</label>
                    <input className="form-input" style={{ background: 'var(--bg-card)' }} name="fullName" value={form.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Số điện thoại</label>
                    <input className="form-input" style={{ background: 'var(--bg-card)' }} name="phone" value={form.phone} onChange={handleChange} placeholder="0912345678" required />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Địa chỉ giao hàng</label>
                  <input
                    className="form-input"
                    style={{ background: 'var(--bg-card)' }}
                    name="address"
                    value={form.address}
                    onChange={(e) => {
                      setSelectedAddressId(null);
                      handleChange(e);
                    }}
                    onBlur={() => {
                      if (form.address.trim()) {
                        requestCheckoutPreview(shippingMethod, appliedVoucherCode, form.address.trim());
                      }
                    }}
                    placeholder="Số nhà, đường, phường, quận, thành phố"
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ghi chú (Tùy chọn)</label>
                  <textarea className="form-input" style={{ background: 'var(--bg-card)', resize: 'vertical' }} name="note" value={form.note} onChange={handleChange} rows={2} placeholder="Yêu cầu giao hàng đặc biệt..." />
                </div>

                {/* Option to save new address to address book */}
                {!selectedAddressId && form.address.trim() && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <input
                      type="checkbox"
                      id="saveToAddresses"
                      checked={saveToAddresses}
                      onChange={(e) => setSaveToAddresses(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <label htmlFor="saveToAddresses" style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Lưu địa chỉ này vào Sổ địa chỉ để sử dụng cho các lần mua sau
                    </label>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 var(--space-8) 0' }} />

              {/* Phương thức vận chuyển */}
              <div className="checkout-section">
                <div className="checkout-section-title">
                  <Truck size={20} /> Phương thức vận chuyển
                </div>
                {shippingMethods.map((m) => {
                  const isSelected = shippingMethod === m.shippingMethod;
                  const feeToDisplay = isSelected && previewData ? previewData.shippingFee : m.shippingFee;
                  const icon = m.shippingMethod === 'SAME_DAY' ? <Zap size={18} color="#f59e0b" /> :
                               m.shippingMethod === 'EXPRESS' ? <Clock size={18} color="#3b82f6" /> :
                               <Truck size={18} color="#10b981" />;
                  return (
                    <div
                      key={m.shippingMethod}
                      className={`payment-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleShippingChange(m.shippingMethod)}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={isSelected}
                        onChange={() => handleShippingChange(m.shippingMethod)}
                      />
                      <div className="payment-option-icon" style={{ background: 'var(--bg)', borderRadius: 8 }}>
                        {icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{m.displayName}</strong>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                            {formatPrice(feeToDisplay)}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          Thời gian dự kiến: <strong>{m.estimatedDelivery}</strong> {m.description && `• ${m.description}`}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Thông tin kho và khối lượng đơn hàng từ Backend */}
                {previewData && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <MapPin size={14} color="var(--primary)" />
                      <span>Xuất kho dự kiến: <strong style={{ color: 'var(--text-primary)' }}>{previewData.warehouseName || previewData.warehouseCode || 'Kho Tổng H&G'}</strong></span>
                      {previewData.distanceKm != null && <span>(khoảng cách: ~<strong>{previewData.distanceKm} km</strong>)</span>}
                    </div>
                    {previewData.totalWeightKg > 0 && (
                      <div style={{ marginLeft: 20, color: 'var(--text-muted)' }}>
                        Tổng khối lượng kiện hàng: <strong>{previewData.totalWeightKg} kg</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 var(--space-8) 0' }} />

              {/* Thanh toán */}
              <div className="checkout-section">
                <div className="checkout-section-title">
                  <CreditCard size={20} /> Phương thức thanh toán
                </div>
                {['COD', 'BANKING'].map((method) => (
                  <div key={method} className={`payment-option ${payment === method ? 'selected' : ''}`} onClick={() => setPayment(method)}>
                    <input type="radio" name="payment" checked={payment === method} onChange={() => setPayment(method)} />
                    <div className="payment-option-icon" style={{ background: method === 'COD' ? '#f8fafc' : '#f0fdf4' }}>
                      {method === 'COD' ? '📦' : '🏦'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {method === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng (VietQR)'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {method === 'COD'
                          ? 'Thanh toán khi nhận hàng.'
                          : 'Xác nhận tức thì qua hệ thống SePay tự động.'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 var(--space-8) 0' }} />

              {/* Mã giảm giá */}
              <div className="checkout-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="checkout-section-title" style={{ margin: 0 }}>
                    <Tag size={20} /> Mã giảm giá
                  </div>
                  {availableVouchers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setVoucherModalOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ticket size={15} /> Chọn mã ({availableVouchers.length})
                    </button>
                  )}
                </div>
                {appliedVoucherCode && previewData?.voucherValid ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f0fdf4', borderRadius: 'var(--radius-lg)', border: '1px solid #bbf7d0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#166534', fontSize: 14, letterSpacing: '0.05em' }}>{appliedVoucherCode}</div>
                      <div style={{ fontSize: 13, color: '#15803d', marginTop: 2 }}>
                        Đã áp dụng mã thành công • Giảm {formatPrice(discount)}
                      </div>
                    </div>
                    <button type="button" onClick={removeVoucher} style={{ color: '#166534', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" placeholder="Nhập mã..." style={{ flex: 1, textTransform: 'uppercase', background: 'var(--bg-card)' }}
                      value={voucherInput} onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyVoucher())} />
                    <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-card)' }} onClick={applyVoucher} disabled={voucherLoading || !voucherInput.trim()}>
                      {voucherLoading ? '...' : 'Áp dụng'}
                    </button>
                  </div>
                )}
                {voucherError && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{voucherError}</div>}
              </div>
            </div>

            {/* ── RIGHT: Summary ── */}
            <div>
              <div className="cart-summary-box">
                <div className="cart-summary-title">Tóm tắt đơn hàng</div>
                
                {/* Scrollable item list if many items */}
                <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 8, marginBottom: 16 }}>
                  {displayItems.map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={resolveImageUrl(item.image)}
                          alt={item.name}
                          style={{ width: 64, height: 64, objectFit: 'contain', background: '#f9fafb', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 6 }}
                          onError={(e) => { e.target.src = ''; e.target.style.background = '#f3f4f6'; }}
                        />
                        <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--text-primary)', color: '#fff', width: 20, height: 20, borderRadius: '50%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #fff' }}>
                          {item.quantity}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{item.brandName || item.brand || 'Product'}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, letterSpacing: '-0.01em' }}>
                        {formatPrice((item.price || 0) * (item.quantity || 1))}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '0 0 16px 0' }} />
                
                <div className="cart-summary-row">
                  <span>Tạm tính</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="cart-summary-row" style={{ color: 'var(--success)' }}>
                    <span>Giảm giá ({appliedVoucherCode})</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="cart-summary-row">
                  <span>Vận chuyển ({previewData?.shippingMethodName || currentShipping?.displayName || 'Tiêu chuẩn'})</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {formatPrice(shippingFee)}
                  </span>
                </div>
                
                <div className="cart-summary-row total">
                  <span>Tổng cộng</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-accent" 
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', marginTop: 'var(--space-6)',
                    padding: '16px 20px', borderRadius: 'var(--radius-lg)',
                    background: 'var(--primary)', color: '#fff',
                    fontWeight: 700, fontSize: 15,
                    transition: 'opacity .2s',
                    opacity: placing ? 0.7 : 1,
                    cursor: placing ? 'not-allowed' : 'pointer'
                  }} 
                  disabled={placing}
                >
                  {placing ? 'Đang xử lý...' : 'Đặt hàng'} <ChevronRight size={16} />
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="5.5" width="11" height="8" rx="1.5" stroke="currentColor"/>
                    <path d="M3 5V4C3 2.34315 4.34315 1 6 1C7.65685 1 9 2.34315 9 4V5" stroke="currentColor" strokeLinecap="round"/>
                  </svg>
                  Thanh toán an toàn & mã hóa
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>
      {/* ── Modal Chọn Địa Chỉ từ Sổ Địa Chỉ ── */}
      {showAddressDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowAddressDrawer(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 20,
              maxWidth: 560,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid var(--border)',
              padding: 24
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Địa Chỉ Nhận Hàng Của Bạn
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Chọn địa chỉ để tự động điền và tính cước vận chuyển
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    style={{
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 14,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      background: isSelected ? '#f8faff' : '#ffffff',
                      transition: 'all 0.15s',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{addr.recipientName}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>|</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{addr.phone}</span>
                        {addr.isDefault && (
                          <span style={{ fontSize: 11, fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 999, border: '1px solid #bfdbfe' }}>
                            ⭐ Mặc định
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--bg)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)' }}>
                          {addr.addressType === 'OFFICE' ? '🏢 Văn phòng' : addr.addressType === 'OTHER' ? '📍 Khác' : '🏠 Nhà riêng'}
                        </span>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: isSelected ? '6px solid var(--primary)' : '2px solid var(--border)',
                        background: 'var(--bg-card)', flexShrink: 0
                      }} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {addr.fullAddress || addr.detailAddress}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <Link
                to="/account/addresses"
                target="_blank"
                style={{
                  fontSize: 13, color: 'var(--primary)', fontWeight: 700,
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <Plus size={14} />
                <span>Quản lý sổ địa chỉ</span>
              </Link>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={() => setShowAddressDrawer(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chọn Voucher Khả dụng */}
      {voucherModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', maxWidth: 500, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ticket size={20} color="var(--primary)" />
                Mã giảm giá khả dụng
              </div>
              <button type="button" onClick={() => setVoucherModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {availableVouchers.map((v) => {
                const isSelected = appliedVoucherCode === v.code;
                return (
                  <div
                    key={v.id}
                    style={{
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected ? '#f8fafc' : '#fff',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                          {v.code}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                          {v.discountType === 'PERCENT' ? `Giảm ${v.discountValue}%` : `Giảm ${formatPrice(v.discountValue)}`}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {v.minOrderValue && Number(v.minOrderValue) > 0 ? `Đơn tối thiểu ${formatPrice(v.minOrderValue)}` : 'Mọi đơn hàng'}
                        {v.discountType === 'PERCENT' && v.maxDiscount && ` • Tối đa ${formatPrice(v.maxDiscount)}`}
                      </div>
                      {v.endDate && (
                        <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>
                          HSD: {formatDate(v.endDate)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => applyVoucherCode(v.code)}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      style={{ borderRadius: 9999, fontSize: 12, padding: '4px 14px' }}
                    >
                      {isSelected ? 'Đang dùng' : 'Áp dụng'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
              <Link to="/account/vouchers" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                Xem tất cả mã giảm giá
              </Link>
              <button type="button" onClick={() => setVoucherModalOpen(false)} className="btn btn-outline btn-sm">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
