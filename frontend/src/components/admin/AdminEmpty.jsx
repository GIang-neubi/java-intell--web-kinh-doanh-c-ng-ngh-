export default function AdminEmpty({ icon: Icon, title = 'Không có dữ liệu', description }) {
  return (
    <div className="hg-admin-state">
      {Icon && <Icon size={42} className="hg-admin-state-icon" />}
      <div className="hg-admin-state-title">{title}</div>
      {description && <p className="hg-admin-state-desc">{description}</p>}
    </div>
  );
}
