import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { fetchProductById } from '../api/products';

export default function RecentlyViewed() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let alive = true;
    try {
      const stored = JSON.parse(localStorage.getItem('hg_recently_viewed') || '[]');
      const validIds = Array.isArray(stored)
        ? stored.filter((id) => typeof id === 'number' || !isNaN(Number(id))).map(Number).slice(0, 5)
        : [];
      if (validIds.length === 0) {
        return;
      }

      Promise.all(
        validIds.map((id) => fetchProductById(id).then((p) => p).catch(() => null))
      ).then((results) => {
        if (!alive) return;
        setProducts(results.filter(Boolean));
      });
    } catch {
      // ignore
    }
    return () => { alive = false; };
  }, []);

  if (products.length === 0) return null;

  return (
    <section style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div className="section-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Đã xem
        </div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.03em', margin: 'var(--space-2) 0 0 0' }}>Sản phẩm mới xem</h2>
      </div>
      <div className="product-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

