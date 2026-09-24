import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminReturns } from '../../../api/returns';
import { formatDate } from '../../../utils/helpers';

export default function AdminReturnList() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminReturns()
      .then(res => setReturns(res.content || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Quản lý Yêu cầu Trả hàng</h2>
      </div>
      
      {loading ? <p>Đang tải...</p> : (
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>ID</th>
              <th style={{ padding: 12 }}>Đơn hàng</th>
              <th style={{ padding: 12 }}>Khách hàng</th>
              <th style={{ padding: 12 }}>Lý do</th>
              <th style={{ padding: 12 }}>Trạng thái</th>
              <th style={{ padding: 12 }}>Ngày yêu cầu</th>
              <th style={{ padding: 12 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {returns.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 12 }}>#{r.id}</td>
                <td style={{ padding: 12 }}>{r.orderCode}</td>
                <td style={{ padding: 12 }}>{r.customerName}</td>
                <td style={{ padding: 12 }}>{r.reason}</td>
                <td style={{ padding: 12 }}><strong>{r.status}</strong></td>
                <td style={{ padding: 12 }}>{formatDate(r.createdAt)}</td>
                <td style={{ padding: 12 }}>
                  <Link to={`/admin/returns/${r.id}`} className="btn btn-outline" style={{ fontSize: 12, padding: '4px 8px' }}>
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>Không có yêu cầu trả hàng nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
