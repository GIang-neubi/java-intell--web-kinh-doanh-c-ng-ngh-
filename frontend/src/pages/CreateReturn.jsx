import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AccountLayout from '../layouts/AccountLayout';
import { createReturnRequest } from '../api/returns';
import { fetchMyOrderById } from '../api/orders';
import { useToast } from '../components/Toast';

export default function CreateReturn() {
  const { id } = useParams(); // orderId
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [reason, setReason] = useState('DEFECTIVE_PRODUCT');
  const [description, setDescription] = useState('');
  
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    fetchMyOrderById(id)
      .then(res => {
        setOrder(res);
        // Default select all items with max quantity and GOOD condition
        const initialSelections = {};
        res.orderItems.forEach(item => {
          initialSelections[item.id] = { selected: false, quantity: item.quantity, condition: 'GOOD', note: '' };
        });
        setSelectedItems(initialSelections);
      })
      .catch(err => {
        showToast(err.message, 'error');
        navigate('/account/returns');
      })
      .finally(() => setInitLoading(false));
  }, [id, navigate, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsToReturn = Object.entries(selectedItems)
      .filter(([_, val]) => val.selected)
      .map(([orderItemId, val]) => ({
        orderItemId: Number(orderItemId),
        quantity: val.quantity,
        condition: val.condition,
        note: val.note
      }));

    if (itemsToReturn.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm cần trả', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      await createReturnRequest({
        orderId: Number(id),
        reason,
        description,
        proofImages: '',
        items: itemsToReturn
      });
      showToast('Yêu cầu trả hàng đã được gửi', 'success');
      navigate('/account/returns');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (orderItemId, field, value) => {
    setSelectedItems(prev => ({
      ...prev,
      [orderItemId]: {
        ...prev[orderItemId],
        [field]: value
      }
    }));
  };

  if (initLoading) return <AccountLayout activeTab="orders"><div>Đang tải...</div></AccountLayout>;
  if (!order) return <AccountLayout activeTab="orders"><div>Không tìm thấy đơn hàng</div></AccountLayout>;

  return (
    <AccountLayout activeTab="orders">
      <div style={{ background: '#fff', padding: 24, borderRadius: 12 }}>
        <h2>Tạo yêu cầu trả hàng cho Đơn #{order.orderCode}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
            <h4>Chọn sản phẩm muốn trả:</h4>
            {order.orderItems.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f5f5f5' }}>
                <input 
                  type="checkbox" 
                  checked={selectedItems[item.id]?.selected || false}
                  onChange={e => handleItemChange(item.id, 'selected', e.target.checked)}
                />
                <img src={`http://localhost:8080/api/public/uploads/${item.product.image}`} alt={item.product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                <div style={{ flex: 1 }}>
                  <div>{item.product.name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>Đã mua: {item.quantity}</div>
                </div>
                {selectedItems[item.id]?.selected && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input 
                      type="number" 
                      min="1" 
                      max={item.quantity} 
                      value={selectedItems[item.id].quantity}
                      onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                      style={{ width: 60, padding: 4 }}
                    />
                    <select 
                      value={selectedItems[item.id].condition}
                      onChange={e => handleItemChange(item.id, 'condition', e.target.value)}
                      style={{ padding: 4 }}
                    >
                      <option value="GOOD">Nguyên vẹn</option>
                      <option value="DEFECTIVE">Lỗi NSX</option>
                      <option value="DAMAGED">Hư hỏng vật lý</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Ghi chú SP"
                      value={selectedItems[item.id].note}
                      onChange={e => handleItemChange(item.id, 'note', e.target.value)}
                      style={{ padding: 4 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>Lý do chung</label>
            <select className="form-input" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: 8 }}>
              <option value="DEFECTIVE_PRODUCT">Sản phẩm lỗi</option>
              <option value="DAMAGED_PRODUCT">Sản phẩm hỏng hóc</option>
              <option value="WRONG_PRODUCT">Giao sai sản phẩm</option>
              <option value="MISSING_ACCESSORIES">Thiếu phụ kiện</option>
              <option value="NOT_AS_DESCRIBED">Không giống mô tả</option>
              <option value="CHANGE_OF_MIND">Đổi ý (Thay đổi nhu cầu)</option>
              <option value="OTHER">Lý do khác</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>Chi tiết / Phản hồi thêm</label>
            <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }}></textarea>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px 24px', alignSelf: 'flex-start' }}>
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </form>
      </div>
    </AccountLayout>
  );
}
