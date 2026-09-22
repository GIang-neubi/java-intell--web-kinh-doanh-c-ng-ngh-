export default function AdminError({ message, onRetry }) {
  return (
    <div className="hg-admin-state error">
      <div className="hg-admin-state-title">Không tải được dữ liệu</div>
      <p className="hg-admin-state-desc">{message || 'Đã xảy ra lỗi.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
