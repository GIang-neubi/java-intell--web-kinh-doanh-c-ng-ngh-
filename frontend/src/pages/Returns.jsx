import { useEffect, useState } from 'react';
import AccountLayout from '../layouts/AccountLayout';
import { fetchMyReturns } from '../api/returns';

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReturns()
      .then(res => setReturns(res.content || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AccountLayout activeTab="returns">
      <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12 }}>
        <h2>Danh sách trả hàng</h2>
        {loading ? <p>Đang tải...</p> : (
          returns.length === 0 ? <p>Chưa có yêu cầu trả hàng nào.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {returns.map(r => (
                <div key={r.id} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
                  <p>Mã đơn: <strong>#{r.orderCode}</strong></p>
                  <p>Trạng thái: <strong>{r.status}</strong></p>
                  <p>Lý do: {r.reason}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AccountLayout>
  );
}
