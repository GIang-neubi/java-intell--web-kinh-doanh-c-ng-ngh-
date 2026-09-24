import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAdminRefundById, processRefund } from '../../../api/refunds';
import { useToast } from '../../../components/Toast';
import { formatPrice } from '../../../utils/helpers';

export default function AdminRefundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const loadData = () => {
    setLoading(true);
    fetchAdminRefundById(id)
      .then(res => {
        setRefund(res);
        setTransactionRef(res.transactionReference || '');
        setAdminNote(res.adminNote || '');
      })
      .catch(err => {
        showToast(err.message, 'error');
        navigate('/admin/refunds');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleProcess = async (status) => {
    if (!window.confirm(`Xác nhận xử lý hoàn tiền (${status})?`)) return;
    try {
      await processRefund(id, status, transactionRef, adminNote);
      showToast('Xử lý hoàn tiền thành công', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (!refund) return <div>Không tìm thấy dữ liệu</div>;

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 12 }}>
      <h2>Chi tiết Hoàn tiền #{refund.id}</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <h4>Thông tin chung</h4>
          <p><strong>Đơn hàng:</strong> {refund.orderCode}</p>
          <p><strong>Khách hàng:</strong> {refund.customerName}</p>
          <p><strong>Số tiền cần hoàn:</strong> <span style={{ fontSize: 18, color: 'red', fontWeight: 'bold' }}>{formatPrice(refund.amount)}</span></p>
          <p><strong>Phương thức:</strong> {refund.paymentMethod}</p>
          <p><strong>Trạng thái:</strong> {refund.status}</p>
        </div>
        
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <h4>Cập nhật Xử lý</h4>
          <label style={{ display: 'block', marginBottom: 4 }}>Mã tham chiếu GD (Mã CK, mã GD ví điện tử)</label>
          <input 
            className="form-input" 
            value={transactionRef} 
            onChange={e => setTransactionRef(e.target.value)} 
            placeholder="VD: MBBANK-123456"
            style={{ width: '100%', marginBottom: 12 }}
            disabled={refund.status === 'REFUNDED'}
          />
          <label style={{ display: 'block', marginBottom: 4 }}>Ghi chú của Admin</label>
          <textarea 
            className="form-input" 
            rows="3" 
            value={adminNote} 
            onChange={e => setAdminNote(e.target.value)} 
            placeholder="Ghi chú nội bộ"
            style={{ width: '100%' }}
            disabled={refund.status === 'REFUNDED'}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #eee', paddingTop: 24 }}>
        {refund.status === 'REFUND_PENDING' && (
          <>
            <button className="btn btn-primary" onClick={() => handleProcess('REFUNDED')}>Đánh dấu ĐÃ HOÀN TIỀN</button>
            <button className="btn btn-danger" onClick={() => handleProcess('REFUND_FAILED')} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4 }}>Đánh dấu THẤT BẠI</button>
          </>
        )}
        <button className="btn btn-outline" onClick={() => navigate('/admin/refunds')}>Quay lại</button>
      </div>
    </div>
  );
}
