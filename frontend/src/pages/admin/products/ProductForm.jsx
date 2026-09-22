import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createProduct, fetchProductById, updateProduct } from '../../../api/products';
import { fetchCategories } from '../../../api/categories';
import { fetchBrands } from '../../../api/brands';
import { getErrorMessage, getFieldErrors } from '../../../api/client';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';

const EMPTY = {
  name: '',
  description: '',
  specifications: '',
  price: '',
  salePrice: '',
  stock: '',
  weightKg: '',
  status: true,
  categoryId: '',
  brandId: '',
};

function validate(form, imageFile, isEdit, hasExistingImage) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Tên sản phẩm không được để trống';
  if (form.price === '' || Number(form.price) <= 0) errors.price = 'Giá phải lớn hơn 0';
  if (form.salePrice !== '' && Number(form.salePrice) < 0) {
    errors.salePrice = 'Giá khuyến mãi phải ≥ 0';
  }
  if (form.salePrice !== '' && form.price !== '' && Number(form.salePrice) > Number(form.price)) {
    errors.salePrice = 'Giá khuyến mãi không được lớn hơn giá gốc';
  }
  if (form.stock === '' || Number(form.stock) < 0 || !Number.isInteger(Number(form.stock))) {
    errors.stock = 'Tồn kho phải là số nguyên ≥ 0';
  }
  if (form.weightKg !== '' && form.weightKg !== null && (Number(form.weightKg) < 0 || isNaN(Number(form.weightKg)))) {
    errors.weightKg = 'Khối lượng phải là số ≥ 0';
  }
  if (!form.categoryId) errors.categoryId = 'Vui lòng chọn danh mục';
  if (!form.brandId) errors.brandId = 'Vui lòng chọn thương hiệu';
  if (!isEdit && !imageFile && !hasExistingImage) {
  }
  return errors;
}

function ImageUpload({ existingUrl = '', file, onFileChange, error, disabled }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');
  const inputRef = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displaySrc = previewUrl || (existingUrl ? `${(import.meta.env.VITE_API_ORIGIN || '')}${existingUrl}` : '');
  const hasImage = Boolean(displaySrc);

  const pickFile = () => inputRef.current?.click();

  const handleSelect = (e) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const type = (selected.type || '').toLowerCase();

    if (!selected.size) {
      setLocalError('File ảnh rỗng');
      return;
    }
    if (selected.size > MAX_SIZE) {
      setLocalError('Ảnh vượt quá dung lượng cho phép (tối đa 5MB)');
      return;
    }
    if (!allowedTypes.includes(type)) {
      setLocalError('Chỉ chấp nhận ảnh JPG, JPEG, PNG, WEBP');
      return;
    }

    setLocalError('');
    onFileChange(selected);
  };

  const clearSelected = () => {
    setLocalError('');
    onFileChange(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="hg-image-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        hidden
        onChange={handleSelect}
        disabled={disabled}
      />

      {!hasImage ? (
        <button
          type="button"
          className="hg-upload-dropzone"
          onClick={pickFile}
          disabled={disabled}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 8 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <strong>Chọn ảnh sản phẩm</strong>
          <span>JPG, JPEG, PNG, WEBP — tối đa 5MB</span>
        </button>
      ) : (
        <div className="hg-upload-preview-card">
          <div className="hg-upload-preview">
            <img src={displaySrc} alt="Preview sản phẩm" />
          </div>
          <div className="hg-upload-meta">
            {file ? (
              <>
                <div className="hg-upload-filename">{file.name}</div>
                <div className="hg-upload-size">{formatFileSize(file.size)}</div>
                <div className="hg-upload-hint">Ảnh mới sẽ được upload khi lưu</div>
              </>
            ) : (
              <>
                <div className="hg-upload-filename">Ảnh hiện tại</div>
                <div className="hg-upload-hint">Giữ ảnh cũ nếu không chọn ảnh mới</div>
              </>
            )}
            <div className="hg-upload-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={pickFile}
                disabled={disabled}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {file || existingUrl ? 'Thay ảnh' : 'Chọn ảnh'}
              </button>
              {file && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={clearSelected}
                  disabled={disabled}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Xóa ảnh đã chọn
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(localError || error) && (
        <div className="hg-field-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {localError || error}
        </div>
      )}
    </div>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [existingImage, setExistingImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  const loadData = useCallback(async () => {
    let alive = true;
    try {
      const [cats, brs] = await Promise.all([fetchCategories(), fetchBrands()]);
      if (!alive) return;
      setCategories(cats);
      setBrands(brs);

      if (isEdit) {
        const product = await fetchProductById(id);
        if (!alive) return;
        setForm({
          name: product.name || '',
          description: product.description || '',
          specifications: product.specifications || '',
          price: product.price ?? '',
          salePrice: product.salePrice ?? '',
          stock: product.stock ?? '',
          weightKg: product.weightKg ?? '',
          status: product.status !== false,
          categoryId: product.categoryId ? String(product.categoryId) : '',
          brandId: product.brandId ? String(product.brandId) : '',
        });
        setExistingImage(product.image || '');
        setImageFile(null);
      }
    } catch (err) {
      if (alive) setError(getErrorMessage(err, 'Không tải được dữ liệu form'));
    } finally {
      if (alive) setLoading(false);
    }
    return () => { alive = false; };
  }, [id, isEdit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const localErrors = validate(form, imageFile, isEdit, Boolean(existingImage));
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setToast('Vui lòng kiểm tra lại các trường bị lỗi');
      setToastType('error');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      specifications: form.specifications.trim() || null,
      price: Number(form.price),
      salePrice: form.salePrice === '' ? null : Number(form.salePrice),
      stock: Number(form.stock),
      weightKg: form.weightKg === '' || form.weightKg === null ? null : Number(form.weightKg),
      status: Boolean(form.status),
      categoryId: Number(form.categoryId),
      brandId: Number(form.brandId),
    };

    setSaving(true);
    setError('');
    setFieldErrors({});
    setToast('');

    try {
      if (isEdit) {
        await updateProduct(id, payload, imageFile);
        setToast('Cập nhật sản phẩm thành công');
        setToastType('success');
        navigate(`/admin/products/${id}`);
      } else {
        const created = await createProduct(payload, imageFile);
        setToast('Tạo sản phẩm thành công');
        setToastType('success');
        navigate(`/admin/products/${created.id}`);
      }
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, isEdit ? 'Cập nhật thất bại' : 'Tạo sản phẩm thất bại'));
      setToast(getErrorMessage(err, isEdit ? 'Cập nhật thất bại' : 'Tạo sản phẩm thất bại'));
      setToastType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading label="Đang tải form sản phẩm..." />;
  if (error && isEdit && !form.name) return <AdminError message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="hg-admin-module">
      <div className="hg-admin-toolbar">
        <Link to={isEdit ? `/admin/products/${id}` : '/admin/products'} className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} /> Quay lại
        </Link>
      </div>

      {toast && (
        <div className={`alert ${toastType === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {toastType === 'success' && <CheckCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />}
          {toastType === 'error' && <AlertCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />}
          {toast}
        </div>
      )}

      <div className="card hg-admin-form-card">
        <h2 className="hg-admin-form-title">{isEdit ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2>
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="hg-admin-form" noValidate>
          <div className="hg-form-section">
            <h3>Thông tin cơ bản</h3>
            <div className="hg-form-grid">
              <div className="form-group hg-span-2">
                <label className="form-label" htmlFor="name">Tên sản phẩm <span className="required">*</span></label>
                <input
                  className="form-input"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="VD: Canon EOS R50"
                  autoComplete="off"
                />
                {fieldErrors.name && <div className="hg-field-error">{fieldErrors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="categoryId">Danh mục <span className="required">*</span></label>
                <select className="form-input" id="categoryId" name="categoryId" value={form.categoryId} onChange={onChange}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {fieldErrors.categoryId && <div className="hg-field-error">{fieldErrors.categoryId}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="brandId">Thương hiệu <span className="required">*</span></label>
                <select className="form-input" id="brandId" name="brandId" value={form.brandId} onChange={onChange}>
                  <option value="">-- Chọn thương hiệu --</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {fieldErrors.brandId && <div className="hg-field-error">{fieldErrors.brandId}</div>}
              </div>
            </div>
          </div>

          <div className="hg-form-section">
            <h3>Giá & kho</h3>
            <div className="hg-form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="price">Giá gốc (VNĐ) <span className="required">*</span></label>
                <input
                  className="form-input"
                  id="price"
                  type="number"
                  min="0"
                  step="1000"
                  name="price"
                  value={form.price}
                  onChange={onChange}
                  inputMode="numeric"
                />
                {fieldErrors.price && <div className="hg-field-error">{fieldErrors.price}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="salePrice">Giá khuyến mãi (VNĐ)</label>
                <input
                  className="form-input"
                  id="salePrice"
                  type="number"
                  min="0"
                  step="1000"
                  name="salePrice"
                  value={form.salePrice}
                  onChange={onChange}
                  placeholder="Để trống nếu không giảm"
                  inputMode="numeric"
                />
                {fieldErrors.salePrice && <div className="hg-field-error">{fieldErrors.salePrice}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="stock">Tồn kho <span className="required">*</span></label>
                <input
                  className="form-input"
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  name="stock"
                  value={form.stock}
                  onChange={onChange}
                  inputMode="numeric"
                />
                {fieldErrors.stock && <div className="hg-field-error">{fieldErrors.stock}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="weightKg">Khối lượng (kg)</label>
                <input
                  className="form-input"
                  id="weightKg"
                  type="number"
                  min="0"
                  step="0.01"
                  name="weightKg"
                  value={form.weightKg}
                  onChange={onChange}
                  placeholder="VD: 0.5 (kg) — dùng tính cước ship"
                />
                {fieldErrors.weightKg && <div className="hg-field-error">{fieldErrors.weightKg}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <label className="hg-checkbox" style={{ marginTop: 10 }}>
                  <input type="checkbox" name="status" checked={form.status} onChange={onChange} />
                  <span className="checkbox-label">Đang bán</span>
                </label>
              </div>
            </div>
          </div>

          <div className="hg-form-section">
            <h3>Mô tả & thông số</h3>
            <div className="hg-form-grid">
              <div className="form-group hg-span-2">
                <label className="form-label" htmlFor="description">Mô tả</label>
                <textarea
                  className="form-input"
                  id="description"
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={onChange}
                  placeholder="Mô tả ngắn về sản phẩm"
                />
              </div>
              <div className="form-group hg-span-2">
                <label className="form-label" htmlFor="specifications">Thông số kỹ thuật</label>
                <textarea
                  className="form-input"
                  id="specifications"
                  name="specifications"
                  rows={5}
                  value={form.specifications}
                  onChange={onChange}
                  placeholder={"Ví dụ:\nCảm biến: APS-C 24.2MP\nISO: 100-32000\nMàn hình: 3.0\" xoay lật"}
                />
              </div>
            </div>
          </div>

          <div className="hg-form-section">
            <h3>Ảnh sản phẩm</h3>
            <ImageUpload
              existingUrl={existingImage}
              file={imageFile}
              onFileChange={setImageFile}
              error={fieldErrors.image}
              disabled={saving}
            />
          </div>

          <div className="hg-form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spinning" style={{ marginRight: 8 }} />
                  Đang lưu...
                </>
              ) : isEdit ? (
                'Cập nhật'
              ) : (
                'Tạo sản phẩm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}