import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAdminReturnById, updateReturnStatus } from '../../../api/returns';
import { useToast } from '../../../components/Toast';

export default function AdminReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [returnReq, setReturnReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState('');

  const loadData = () => {
    setLoading(true);
    fetchAdminReturnById(id)
      .then(res => {
        setReturnReq(res);
        setAdminNote(res.adminNote || '');
      })
      .catch(err => {
        showToast(err.message, 'error');
        navigate('/admin/returns');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUpdateStatus = async (status) => {
    if (!window.confirm(`Xác nhận chuyển trạng thái sang ${status}?`)) return;
    try {
      await updateReturnStatus(id, status, adminNote);
      showToast('Cập nhật trạng thái thành công', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (!returnReq) return <div>Không tìm thấy dữ liệu</div>;

  return (
    <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12 }}>
      <h2>Chi tiết Trả hàng #{returnReq.id}</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <h4>Thông tin chung</h4>
          <p><strong>Đơn hàng:</strong> {returnReq.orderCode}</p>
          <p><strong>Khách hàng:</strong> {returnReq.customerName}</p>
          <p><strong>Trạng thái:</strong> {returnReq.status}</p>
          <p><strong>Lý do:</strong> {returnReq.reason}</p>
          <p><strong>Chi tiết:</strong> {returnReq.description}</p>
        </div>
        
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <h4>Ghi chú của Admin</h4>
          <textarea 
            className="form-input" 
            rows="4" 
            value={adminNote} 
            onChange={e => setAdminNote(e.target.value)} 
            placeholder="Nhập ghi chú (chỉ nội bộ)"
            style={{ width: '100%', marginBottom: 12 }}
          />
        </div>
      </div>
      
      <h4>Sản phẩm trả lại</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>Sản phẩm</th>
            <th style={{ padding: 8, textAlign: 'center' }}>Số lượng</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Tình trạng</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Ghi chú KH</th>
          </tr>
        </thead>
        <tbody>
          {returnReq.items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{item.productName}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: 8 }}>{item.condition}</td>
              <td style={{ padding: 8 }}>{item.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #eee', paddingTop: 24 }}>
        {returnReq.status === 'RETURN_REQUESTED' && (
          <>
            <button className="btn btn-primary" onClick={() => handleUpdateStatus('RETURN_APPROVED')}>Duyệt trả hàng</button>
            <button className="btn btn-danger" onClick={() => handleUpdateStatus('RETURN_REJECTED')} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4 }}>Từ chối</button>
          </>
        )}
        {returnReq.status === 'RETURN_APPROVED' && (
          <button className="btn btn-primary" onClick={() => handleUpdateStatus('RETURNING')}>Đang gửi về kho</button>
        )}
        {returnReq.status === 'RETURNING' && (
          <button className="btn btn-primary" onClick={() => handleUpdateStatus('RETURN_RECEIVED')}>Đã nhận hàng (Hoàn kho)</button>
        )}
        <button className="btn btn-outline" onClick={() => navigate('/admin/returns')}>Quay lại</button>
      </div>
    </div>
  );
}
