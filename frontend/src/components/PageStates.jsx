import { Loader2 } from 'lucide-react';

export default function PageLoading({ label = 'Đang tải...' }) {
  return (
    <div className="hg-state">
      <Loader2 size={40} className="hg-state-icon" style={{ animation: 'hg-spin 0.8s linear infinite' }} />
      <p className="hg-state-desc">{label}</p>
    </div>
  );
}

export function PageError({ message, onRetry }) {
  return (
    <div className="hg-state error">
      <div className="hg-state-title">Không tải được dữ liệu</div>
      <p className="hg-state-desc">{message || 'Đã xảy ra lỗi. Vui lòng thử lại.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function PageEmpty({ icon: Icon, title = 'Không có dữ liệu', description }) {
  return (
    <div className="hg-state">
      {Icon && <Icon size={42} className="hg-state-icon" />}
      <div className="hg-state-title">{title}</div>
      {description && <p className="hg-state-desc">{description}</p>}
    </div>
  );
}
