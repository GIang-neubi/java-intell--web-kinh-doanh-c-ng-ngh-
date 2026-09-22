import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Shield, RotateCcw, Truck, Headphones } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="hg-footer">
      <div className="hg-footer-cta">
        <div className="container">
          <div className="hg-footer-cta-grid">
            <div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 'var(--space-4)' }}>
                Cần hỗ trợ?
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-base)' }}>
                Đội ngũ tư vấn viên sẵn sàng hỗ trợ bạn 24/7.
              </div>
            </div>
            <Link to="/products" className="hg-footer-cta-btn">
              Xem sản phẩm
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 'var(--space-20)', paddingBottom: 'var(--space-12)' }}>
        <div className="hg-footer-grid">
          {/* Brand */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 'var(--text-2xl)', letterSpacing: '-0.04em', color: 'var(--text-primary)', marginBottom: 'var(--space-5)' }}>
              H&G Store
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.7, maxWidth: '280px', marginBottom: 'var(--space-6)' }}>
              Công nghệ chính xác và thiết bị nhiếp ảnh chuyên nghiệp cho người sáng tạo hiện đại.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {['FB', 'IG', 'TW', 'YT'].map((social) => (
                <a key={social} href="#" aria-label={social} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', transition: 'all var(--transition)' }} onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }} onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                  {social}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="hg-footer-links">
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}>Sản phẩm</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Máy ảnh', 'Laptop', 'Điện thoại', 'Phụ kiện'].map(l => (
                  <Link key={l} to="/products" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textDecoration: 'none', transition: 'color var(--transition)' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}>Hỗ trợ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Liên hệ', 'Thông tin giao hàng', 'Đổi trả', 'Bảo hành'].map(l => (
                  <a key={l} href="#" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textDecoration: 'none', transition: 'color var(--transition)' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>{l}</a>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}>Công ty</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Giới thiệu H&G', 'Tuyển dụng', 'Báo chí', 'Chính sách bảo mật'].map(l => (
                  <a key={l} href="#" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textDecoration: 'none', transition: 'color var(--transition)' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>{l}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact & Trust */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}>Liên hệ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--space-8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <Phone size={14} strokeWidth={1.5} /> 028 1234 5678
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <Mail size={14} strokeWidth={1.5} /> support@hgstore.vn
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <MapPin size={14} strokeWidth={1.5} /> 123 Điện Biên Phủ, TP.HCM
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                <Shield size={14} strokeWidth={1.5} /> Thanh toán bảo mật
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                <RotateCcw size={14} strokeWidth={1.5} /> Đổi trả miễn phí 7 ngày
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                <Truck size={14} strokeWidth={1.5} /> Giao hàng toàn quốc
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                <Headphones size={14} strokeWidth={1.5} /> Hỗ trợ 24/7
              </div>
            </div>
          </div>
        </div>

        <div className="hg-footer-bottom">
          <div>© 2026 H&G Technology & Camera. Mọi quyền được bảo lưu.</div>
          <div>
            <span style={{ marginRight: 'var(--space-6)' }}>Điều khoản dịch vụ</span>
            <span>Chính sách bảo mật</span>
          </div>
        </div>
      </div>

      <style>{`
        .hg-footer { background: #fff; border-top: 1px solid var(--border); }
        .hg-footer-cta { background: var(--primary); color: #fff; padding: var(--space-10) 0; }
        .hg-footer-cta-grid { display: flex; justify-content: space-between; align-items: center; gap: var(--space-8); flex-wrap: wrap; }
        .hg-footer-cta-btn { background: #fff; color: var(--primary); padding: 12px 28px; border-radius: var(--radius-full); font-weight: 700; font-size: var(--text-sm); text-decoration: none; transition: transform var(--transition); }
        .hg-footer-cta-btn:hover { transform: scale(0.97); }
        .hg-footer-grid { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: var(--space-16); margin-bottom: var(--space-16); }
        @media (max-width: 1024px) {
          .hg-footer-grid { grid-template-columns: 1fr 1fr; gap: var(--space-10); }
        }
        @media (max-width: 768px) {
          .hg-footer-grid { grid-template-columns: 1fr; }
          .hg-footer-cta-grid { flex-direction: column; text-align: center; align-items: center; }
        }
        .hg-footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-8); }
        @media (max-width: 600px) {
          .hg-footer-links { grid-template-columns: 1fr; }
        }
        .hg-footer-bottom {
          border-top: 1px solid var(--border);
          padding-top: var(--space-6);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        @media (max-width: 600px) {
          .hg-footer-bottom { flex-direction: column; gap: var(--space-3); text-align: center; }
        }
      `}</style>
    </footer>
  );
}
