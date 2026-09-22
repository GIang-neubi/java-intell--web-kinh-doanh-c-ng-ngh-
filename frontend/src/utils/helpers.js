// Format currency VND
export const formatPrice = (price) => {
  const num = Number(price);
  const safe = !isNaN(num) && num >= 0 ? num : 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(safe);
};

// Calculate discount percent
export const discountPercent = (oldPrice, newPrice) => {
  if (!oldPrice || oldPrice <= newPrice) return 0;
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
};

// Format date
export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

// Status label
export const statusLabel = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

// Status class
export const statusClass = {
  PENDING: 'status-pending',
  CONFIRMED: 'status-confirmed',
  PROCESSING: 'status-processing',
  SHIPPING: 'status-shipping',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
};

export const paymentStatusLabel = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  NOT_REQUIRED: 'Không yêu cầu',
};

/** Sum line items; falls back to total + discount when items missing. */
export const orderItemsSubtotal = (order) => {
  if (!order) return 0;
  const items = order.items || [];
  if (items.length > 0) {
    return items.reduce((sum, item) => sum + Number(item.subTotal ?? item.price * item.quantity), 0);
  }
  const total = Number(order.totalAmount) || 0;
  const discount = Number(order.discountAmount) || 0;
  return total + discount;
};

// Delivery status helpers
export const deliveryStatusLabel = {
  PENDING_ASSIGNMENT: 'Chờ phân công',
  ASSIGNED: 'Đã gán shipper',
  SHIPPER_ACCEPTED: 'Shipper đã nhận',
  PICKED_UP: 'Đã lấy hàng',
  IN_TRANSIT: 'Đang giao hàng',
  ARRIVED: 'Đã đến địa chỉ',
  DELIVERED: 'Giao thành công',
  DELIVERY_FAILED: 'Giao thất bại',
  CANCELLED: 'Đã hủy',
};

export const deliveryStatusColor = {
  PENDING_ASSIGNMENT: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  ASSIGNED: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  SHIPPER_ACCEPTED: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  PICKED_UP: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  IN_TRANSIT: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  ARRIVED: { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' },
  DELIVERED: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  DELIVERY_FAILED: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  CANCELLED: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
};

export const shippingMethodLabel = {
  STANDARD: 'Giao Tiêu Chuẩn',
  EXPRESS: 'Giao Hỏa Tốc',
  SAME_DAY: 'Giao Trong Ngày',
};
