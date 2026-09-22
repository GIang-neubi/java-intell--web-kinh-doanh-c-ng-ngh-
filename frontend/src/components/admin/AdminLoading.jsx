export default function AdminLoading({ label = 'Đang tải...' }) {
  return (
    <div className="hg-admin-state">
      <div className="hg-admin-spinner" />
      <p>{label}</p>
    </div>
  );
}
