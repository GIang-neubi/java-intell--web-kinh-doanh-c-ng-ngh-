import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { fetchProducts } from '../api/products';
import { fetchCategories } from '../api/categories';
import { fetchBrands } from '../api/brands';
import Modal from '../components/Modal';

const SORT_OPTIONS = [
  { value: 'id_desc',    label: 'Mặc định' },
  { value: 'price_asc',  label: 'Giá: Thấp đến Cao' },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp' },
  { value: 'name_asc',   label: 'Tên A–Z' },
  { value: 'name_desc',  label: 'Tên Z–A' },
];

const PRICE_RANGES = [
  { label: 'Tất cả',        min: null,      max: null      },
  { label: 'Dưới 10 triệu', min: null,      max: 10000000  },
  { label: '10 – 30 triệu', min: 10000000,  max: 30000000  },
  { label: '30 – 60 triệu', min: 30000000,  max: 60000000  },
  { label: 'Trên 60 triệu', min: 60000000,  max: null      },
];

const PER_PAGE = 12;

function ProductSkeleton() {
  return (
    <div className="product-card" style={{ opacity: 0.5 }}>
      <div style={{ background: '#f3f4f6', aspectRatio: '1' }} />
      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ height: 10, width: 40, background: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 14, width: '80%', background: '#e5e7eb', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 14, width: '50%', background: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 20, width: 80, background: '#e5e7eb', borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Products & filter data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Filter state (synced from URL)
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [inputVal, setInputVal] = useState(searchParams.get('keyword') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [brandId, setBrandId] = useState(searchParams.get('brandId') || '');
  const [priceIdx, setPriceIdx] = useState(Number(searchParams.get('price') || 0));
  const [sort, setSort] = useState(searchParams.get('sort') || 'id_desc');
  const [page, setPage] = useState(Number(searchParams.get('page') || 0));

  const debounceRef = useRef(null);

  // Load categories & brands once
  useEffect(() => {
    Promise.all([fetchCategories(), fetchBrands()])
      .then(([cats, brs]) => { setCategories(cats); setBrands(brs); })
      .catch(() => {});
  }, []);

  // Debounced keyword search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword]);

  // Load products whenever filters change
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [sortBy, sortDir] = sort.split('_');
    const range = PRICE_RANGES[priceIdx] || PRICE_RANGES[0];
    try {
      const data = await fetchProducts({
        keyword: keyword.trim() || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        minPrice: range.min ?? undefined,
        maxPrice: range.max ?? undefined,
        pageNo: page,
        pageSize: PER_PAGE,
        sortBy,
        sortDir,
      });
      setProducts(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch {
      setError('Không tải được danh sách sản phẩm. Vui lòng thử lại.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, categoryId, brandId, priceIdx, sort, page]);

  useEffect(() => { load(); }, [load]);

  // Sync state from URL searchParams whenever URL changes
  useEffect(() => {
    const urlKeyword = searchParams.get('keyword') || '';
    const urlCategory = searchParams.get('categoryId') || '';
    const urlBrand = searchParams.get('brandId') || '';
    const urlPrice = Number(searchParams.get('price') || 0);
    const urlSort = searchParams.get('sort') || 'id_desc';
    const urlPage = Number(searchParams.get('page') || 0);

    setKeyword(urlKeyword);
    setInputVal(urlKeyword);
    setCategoryId(urlCategory);
    setBrandId(urlBrand);
    setPriceIdx(urlPrice);
    setSort(urlSort);
    setPage(urlPage);
  }, [searchParams]);

  const updateParams = useCallback((newFilters) => {
    const current = {
      keyword,
      categoryId,
      brandId,
      price: priceIdx > 0 ? String(priceIdx) : undefined,
      sort: sort !== 'id_desc' ? sort : undefined,
      page: page > 0 ? String(page) : undefined,
      ...newFilters,
    };
    const nextParams = {};
    Object.entries(current).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null && v !== 0 && v !== '0') {
        nextParams[k] = String(v);
      }
    });
    setSearchParams(nextParams);
  }, [keyword, categoryId, brandId, priceIdx, sort, page, setSearchParams]);

  // Debounced search input handler
  const handleSearchInput = (e) => {
    setInputVal(e.target.value);
  };
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setKeyword(inputVal);
    updateParams({ keyword: inputVal.trim() || undefined, page: undefined });
  };

  const handleCategoryChange = (id) => {
    const nextCat = categoryId === String(id) ? '' : String(id);
    setCategoryId(nextCat);
    setPage(0);
    updateParams({ categoryId: nextCat || undefined, page: undefined });
  };
  const handleBrandChange = (id) => {
    const nextBrand = brandId === String(id) ? '' : String(id);
    setBrandId(nextBrand);
    setPage(0);
    updateParams({ brandId: nextBrand || undefined, page: undefined });
  };
  const handlePriceChange = (idx) => {
    setPriceIdx(idx);
    setPage(0);
    updateParams({ price: idx > 0 ? String(idx) : undefined, page: undefined });
  };
  const handleSortChange = (e) => {
    const nextSort = e.target.value;
    setSort(nextSort);
    setPage(0);
    updateParams({ sort: nextSort !== 'id_desc' ? nextSort : undefined, page: undefined });
  };

  // Mobile drawer apply handlers
  const applyMobileFilters = (newCat, newBrand, newPrice, newSort) => {
    setCategoryId(newCat);
    setBrandId(newBrand);
    setPriceIdx(newPrice);
    setSort(newSort);
    setPage(0);
    updateParams({
      categoryId: newCat || undefined,
      brandId: newBrand || undefined,
      price: newPrice > 0 ? String(newPrice) : undefined,
      sort: newSort !== 'id_desc' ? newSort : undefined,
      page: undefined,
    });
  };

  const clearFilters = () => {
    setCategoryId(''); setBrandId(''); setPriceIdx(0); setKeyword(''); setInputVal(''); setPage(0);
  };
  const removeFilter = (type) => {
    if (type === 'keyword') { setKeyword(''); setInputVal(''); setPage(0); }
    else if (type === 'category') { setCategoryId(''); setPage(0); }
    else if (type === 'brand') { setBrandId(''); setPage(0); }
    else if (type === 'price') { setPriceIdx(0); setPage(0); }
  };

  const hasFilters = keyword || categoryId || brandId || priceIdx > 0;

  // Active filter chips data
  const categoryObj = categories.find((c) => String(c.id) === categoryId);
  const brandObj = brands.find((b) => String(b.id) === brandId);
  const priceObj = PRICE_RANGES[priceIdx];

  const activeChips = [];
  if (keyword) activeChips.push({ type: 'keyword', label: `Tìm: "${keyword}"`, remove: () => removeFilter('keyword') });
  if (categoryObj) activeChips.push({ type: 'category', label: categoryObj.name, remove: () => removeFilter('category') });
  if (brandObj) activeChips.push({ type: 'brand', label: brandObj.name, remove: () => removeFilter('brand') });
  if (priceIdx > 0 && priceObj) activeChips.push({ type: 'price', label: priceObj.label, remove: () => removeFilter('price') });

  return (
    <main className="page-content" style={{ background: 'var(--bg)' }}>
      <div className="container">
        {/* Breadcrumb + Title */}
        <div style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-4)' }}>
          <nav aria-label="Breadcrumb" className="breadcrumb" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)' }}>Trang chủ</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Sản phẩm</span>
          </nav>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            {keyword ? `Tìm kiếm: "${keyword}"` : 'Tất cả sản phẩm'}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 8 }}>
            {loading ? 'Đang tải...' : `${totalElements.toLocaleString('vi-VN')} sản phẩm`}
          </p>
        </div>

        {/* Search bar (desktop) */}
        <div className="products-search-bar" style={{ marginBottom: 'var(--space-6)' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', padding: '0 18px', gap: 8 }}>
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={inputVal}
                onChange={handleSearchInput}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(e); }}
                aria-label="Tìm kiếm sản phẩm"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 'var(--text-sm)', padding: '12px 0', color: 'var(--text-primary)', background: 'transparent' }}
              />
              {inputVal && (
                <button type="button" onClick={() => { setInputVal(''); setKeyword(''); setPage(0); }} aria-label="Xóa tìm kiếm" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)', padding: '12px 24px', whiteSpace: 'nowrap' }}>
              Tìm kiếm
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Bộ lọc"
              style={{ display: 'none', borderRadius: 'var(--radius-full)', padding: '12px 20px', whiteSpace: 'nowrap' }}
            >
              <SlidersHorizontal size={16} /> Lọc
            </button>
          </form>
        </div>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="filter-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-6)' }}>
            {activeChips.map((chip) => (
              <button
                key={chip.type}
                onClick={chip.remove}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all var(--transition)', fontWeight: 500,
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                aria-label={`Xóa bộ lọc: ${chip.label}`}
              >
                {chip.label}
                <X size={12} />
              </button>
            ))}
            <button
              onClick={clearFilters}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                background: 'transparent', border: '1px solid var(--border)',
                fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              Xóa tất cả
            </button>
          </div>
        )}

        <div className="products-page-layout">
          {/* Desktop: Sidebar Filters */}
          <aside className="filter-sidebar">
            <div className="filter-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Bộ lọc</div>
                {hasFilters && (
                  <button onClick={clearFilters} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Xóa tất cả
                  </button>
                )}
              </div>

              <div className="filter-section">
                <div className="filter-section-title">Danh mục</div>
                <div className="filter-section-body">
                  {categories.map((cat) => (
                    <label key={cat.id} className="filter-option">
                      <input type="checkbox" checked={categoryId === String(cat.id)} onChange={() => handleCategoryChange(cat.id)} />
                      {cat.name}
                    </label>
                  ))}
                  {categories.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải...</div>}
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-section-title">Thương hiệu</div>
                <div className="filter-section-body">
                  {brands.map((b) => (
                    <label key={b.id} className="filter-option">
                      <input type="checkbox" checked={brandId === String(b.id)} onChange={() => handleBrandChange(b.id)} />
                      {b.name}
                    </label>
                  ))}
                  {brands.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải...</div>}
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-section-title">Khoảng giá</div>
                <div className="filter-section-body">
                  {PRICE_RANGES.map((r, idx) => (
                    <label key={r.label} className="filter-option">
                      <input type="radio" name="price" checked={priceIdx === idx} onChange={() => handlePriceChange(idx)} />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div>
            {/* Toolbar */}
            <div className="products-toolbar">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Hiển thị <strong style={{ color: 'var(--text-primary)' }}>{loading ? '...' : totalElements}</strong> kết quả
                {page > 0 && <span style={{ color: 'var(--text-muted)' }}> (trang {page + 1})</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Sắp xếp</span>
                <select className="sort-select" value={sort} onChange={handleSortChange} aria-label="Sắp xếp">
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile: Filter & Sort buttons */}
            <div className="mobile-filter-bar" style={{ display: 'none', gap: 8, marginBottom: 'var(--space-4)' }}>
              <button className="btn btn-outline" onClick={() => setMobileDrawerOpen(true)} style={{ flex: 1, borderRadius: 'var(--radius-full)' }}>
                <SlidersHorizontal size={14} /> Bộ lọc
              </button>
              <div style={{ position: 'relative' }}>
                <select
                  className="sort-select"
                  value={sort}
                  onChange={handleSortChange}
                  aria-label="Sắp xếp"
                  style={{ width: '100%', padding: '10px 36px 10px 14px' }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '120px 0', color: 'var(--danger)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{error}</div>
                <button className="btn btn-primary btn-sm" onClick={load} style={{ borderRadius: 'var(--radius-full)' }}>Thử lại</button>
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-20) 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 24, opacity: 0.2 }}>🔍</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Không tìm thấy sản phẩm</div>
                <div style={{ fontSize: 14, marginBottom: 24 }}>Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc.</div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {hasFilters && (
                    <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)', padding: '12px 24px' }} onClick={clearFilters}>
                      Xóa bộ lọc
                    </button>
                  )}
                  <Link to="/products" className="btn btn-outline" style={{ borderRadius: 'var(--radius-full)', padding: '12px 24px' }}>
                    Xem tất cả sản phẩm
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="product-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 'var(--space-16)', flexWrap: 'wrap' }}>
                    <button
                      className="btn"
                      style={{ padding: '8px 16px', background: page === 0 ? 'transparent' : '#fff', border: '1px solid var(--border)', color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)', borderRadius: 'var(--radius-sm)', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                      disabled={page === 0}
                      onClick={() => { setPage((p) => p - 1); window.scrollTo(0, 0); }}
                    >
                      Trước
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i).map((i) => (
                      <button
                        key={i}
                        className="btn"
                        style={{ padding: '8px 16px', background: i === page ? 'var(--primary)' : '#fff', color: i === page ? '#fff' : 'var(--text-secondary)', border: i === page ? '1px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => { setPage(i); window.scrollTo(0, 0); }}
                      >
                        {i + 1}
                      </button>
                    ))}
                    {totalPages > 7 && <span style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--text-muted)' }}>...</span>}
                    <button
                      className="btn"
                      style={{ padding: '8px 16px', background: page === totalPages - 1 ? 'transparent' : '#fff', border: '1px solid var(--border)', color: page === totalPages - 1 ? 'var(--text-muted)' : 'var(--text-primary)', borderRadius: 'var(--radius-sm)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer' }}
                      disabled={page === totalPages - 1}
                      onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0); }}
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        categories={categories}
        brands={brands}
        priceRanges={PRICE_RANGES}
        priceIdx={priceIdx}
        sort={sort}
        sortOptions={SORT_OPTIONS}
        categoryId={categoryId}
        brandId={brandId}
        applyMobileFilters={applyMobileFilters}
        onClear={clearFilters}
        hasFilters={hasFilters}
      />
    </main>
  );
}

function MobileFilterDrawer({ open, onClose, categories, brands, priceRanges, priceIdx, sort, sortOptions, categoryId, brandId, applyMobileFilters, onClear, hasFilters }) {
  const [localCat, setLocalCat] = useState(categoryId);
  const [localBrand, setLocalBrand] = useState(brandId);
  const [localPrice, setLocalPrice] = useState(priceIdx);
  const [localSort, setLocalSort] = useState(sort);

  useEffect(() => {
    setLocalCat(categoryId); setLocalBrand(brandId); setLocalPrice(priceIdx); setLocalSort(sort);
  }, [categoryId, brandId, priceIdx, sort, open]);

  const handleApply = () => {
    applyMobileFilters(localCat, localBrand, localPrice, localSort);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Bộ lọc" showClose={false}>
      <div style={{ padding: 'var(--space-4) 0' }}>
        <div className="filter-section">
          <div className="filter-section-title">Danh mục</div>
          <div className="filter-section-body">
            {categories.map((cat) => (
              <label key={cat.id} className="filter-option">
                <input type="checkbox" checked={String(localCat) === String(cat.id)} onChange={() => setLocalCat(String(cat.id))} />
                {cat.name}
              </label>
            ))}
          </div>
        </div>
        <div className="filter-section">
          <div className="filter-section-title">Thương hiệu</div>
          <div className="filter-section-body">
            {brands.map((b) => (
              <label key={b.id} className="filter-option">
                <input type="checkbox" checked={String(localBrand) === String(b.id)} onChange={() => setLocalBrand(String(b.id))} />
                {b.name}
              </label>
            ))}
          </div>
        </div>
        <div className="filter-section">
          <div className="filter-section-title">Khoảng giá</div>
          <div className="filter-section-body">
            {priceRanges.map((r, idx) => (
              <label key={r.label} className="filter-option">
                <input type="radio" name="price-mobile" checked={localPrice === idx} onChange={() => setLocalPrice(idx)} />
                {r.label}
              </label>
            ))}
          </div>
        </div>
        <div className="filter-section">
          <div className="filter-section-title">Sắp xếp</div>
          <div className="filter-section-body">
            {sortOptions.map((o) => (
              <label key={o.value} className="filter-option">
                <input type="radio" name="sort-mobile" checked={localSort === o.value} onChange={() => setLocalSort(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          {hasFilters && (
            <button onClick={() => { onClear(); onClose(); }} className="btn btn-ghost" style={{ borderRadius: 'var(--radius-full)' }}>
              Xóa tất cả
            </button>
          )}
          <button onClick={handleApply} className="btn btn-primary" style={{ flex: 1, borderRadius: 'var(--radius-full)' }}>
            Áp dụng
          </button>
        </div>
      </div>
    </Modal>
  );
}
