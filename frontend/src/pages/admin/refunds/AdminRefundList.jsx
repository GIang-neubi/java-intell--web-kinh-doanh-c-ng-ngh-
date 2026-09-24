import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminRefunds } from '../../../api/refunds';
import { formatDate, formatPrice } from '../../../utils/helpers';

export default function AdminRefundList() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminRefunds()
      .then(res => setRefunds(res.content || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Quản lý Hoàn tiền</h2>
      </div>
      
      {loading ? <p>Đang tải...</p> : (
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>ID</th>
              <th style={{ padding: 12 }}>Đơn hàng</th>
              <th style={{ padding: 12 }}>Khách hàng</th>
              <th style={{ padding: 12 }}>Số tiền</th>
              <th style={{ padding: 12 }}>Trạng thái</th>
              <th style={{ padding: 12 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 12 }}>#{r.id}</td>
                <td style={{ padding: 12 }}>{r.orderCode}</td>
                <td style={{ padding: 12 }}>{r.customerName}</td>
                <td style={{ padding: 12, fontWeight: 'bold' }}>{formatPrice(r.amount)}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ color: r.status === 'REFUNDED' ? 'green' : 'orange', fontWeight: 'bold' }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: 12 }}>
                  <Link to={`/admin/refunds/${r.id}`} className="btn btn-outline" style={{ fontSize: 12, padding: '4px 8px' }}>
                    Xử lý
                  </Link>
                </td>
              </tr>
            ))}
            {refunds.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>Không có khoản hoàn tiền nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
