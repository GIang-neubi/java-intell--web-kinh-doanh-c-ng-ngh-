import { Construction } from 'lucide-react';

export default function AdminPlaceholder({ title, description }) {
  return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <Construction size={40} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <p className="text-muted" style={{ maxWidth: 420, margin: '0 auto' }}>
        {description || 'Module này sẽ được xây dựng ở bước tiếp theo.'}
      </p>
    </div>
  );
}
