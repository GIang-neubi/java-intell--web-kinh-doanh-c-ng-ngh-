import { useEffect, useState } from 'react';
import AccountLayout from '../layouts/AccountLayout';
import { fetchMyRefunds } from '../api/refunds';
import { formatPrice, formatDate } from '../utils/helpers';

export default function Refunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRefunds()
      .then(res => setRefunds(res.content || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AccountLayout activeTab="refunds">
      <div style={{ background: '#fff', padding: 24, borderRadius: 12 }}>
        <h2>Danh sách hoàn tiền</h2>
        {loading ? <p>Đang tải...</p> : (
          refunds.length === 0 ? <p>Chưa có khoản hoàn tiền nào.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {refunds.map(r => (
                <div key={r.id} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
                  <p>Mã đơn: <strong>#{r.orderCode}</strong></p>
                  <p>Số tiền hoàn: <strong>{formatPrice(r.amount)}</strong></p>
                  <p>Phương thức: {r.paymentMethod}</p>
                  <p>Trạng thái: <strong style={{ color: r.status === 'REFUNDED' ? 'green' : 'orange' }}>{r.status}</strong></p>
                  <p>Ngày tạo: {formatDate(r.createdAt)}</p>
                  {r.transactionReference && <p>Mã giao dịch (NHTM/Ví): {r.transactionReference}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AccountLayout>
  );
}
