const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

/**
 * Resolve product image path for <img src>.
 * Supports: absolute http(s), /uploads/..., or legacy external URLs.
 */
export function resolveImageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${API_ORIGIN}${path}`;
  }
  return path;
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file) {
  if (!file) return 'Chưa chọn file ảnh';
  if (!file.size) return 'File ảnh rỗng';
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh vượt quá dung lượng cho phép (tối đa 5MB)';
  const type = (file.type || '').toLowerCase();
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(type)) return 'Chỉ chấp nhận ảnh JPG, JPEG, PNG, WEBP';
  const name = (file.name || '').toLowerCase();
  if (!/\.(jpe?g|png|webp)$/.test(name) && !allowed.includes(type)) {
    return 'Định dạng file không hợp lệ';
  }
  return '';
}
