import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import {
  formatFileSize,
  IMAGE_ACCEPT,
  resolveImageUrl,
  validateImageFile,
} from '../../utils/imageUrl';

export default function ImageUploadField({
  existingUrl = '',
  file,
  onFileChange,
  error,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displaySrc = previewUrl || resolveImageUrl(existingUrl);
  const hasImage = Boolean(displaySrc);

  const pickFile = () => inputRef.current?.click();

  const handleSelect = (e) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;
    const msg = validateImageFile(selected);
    if (msg) {
      setLocalError(msg);
      return;
    }
    setLocalError('');
    onFileChange(selected);
  };

  const clearSelected = () => {
    setLocalError('');
    onFileChange(null);
  };

  return (
    <div className="hg-upload">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={handleSelect}
      />

      {!hasImage ? (
        <button type="button" className="hg-upload-dropzone" onClick={pickFile}>
          <ImagePlus size={28} />
          <strong>Chọn ảnh</strong>
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
                <div className="text-muted text-sm">{formatFileSize(file.size)}</div>
                <div className="text-muted text-sm">Ảnh mới sẽ được upload khi lưu</div>
              </>
            ) : (
              <>
                <div className="hg-upload-filename">Ảnh hiện tại</div>
                <div className="text-muted text-sm">Giữ ảnh cũ nếu không chọn ảnh mới</div>
              </>
            )}
            <div className="hg-upload-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={pickFile}>
                <RefreshCw size={14} /> {file || existingUrl ? 'Thay ảnh' : 'Chọn ảnh'}
              </button>
              {file && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelected}>
                  <Trash2 size={14} /> Xóa ảnh đã chọn
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(localError || error) && (
        <div className="hg-field-error">{localError || error}</div>
      )}
    </div>
  );
}
