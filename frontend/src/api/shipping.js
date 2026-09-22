import api from './client';

/**
 * Lấy danh sách các phương thức giao hàng khả dụng kèm phí và thời gian dự kiến
 * @param {number} orderAmount
 */
export async function getShippingMethods(params = {}) {
  const query = typeof params === 'object' ? params : { orderAmount: params };
  const { data } = await api.get('/shipping/methods', {
    params: query,
  });
  if (!data.success) throw new Error(data.message || 'Không thể lấy phương thức vận chuyển');
  return data.data;
}

/**
 * Tính phí vận chuyển cụ thể theo phương thức
 * @param {string} shippingMethod - STANDARD | EXPRESS | SAME_DAY
 * @param {number} orderAmount
 * @param {string} destinationAddress
 */
export async function calculateShippingFee(shippingMethod, orderAmount = 0, destinationAddress = '') {
  const { data } = await api.post('/shipping/calculate', {
    shippingMethod,
    orderAmount,
    destinationAddress,
  });
  if (!data.success) throw new Error(data.message || 'Không thể tính phí vận chuyển');
  return data.data;
}

/**
 * Tính toán chi phí đơn hàng chuẩn xác từ Backend (Subtotal, Discount, ShippingFee, GrandTotal)
 * @param {Object} params - { shippingMethod, voucherCode, shippingAddress, customerLatitude, customerLongitude }
 */
export async function checkoutPreview(params = {}) {
  const { data } = await api.post('/orders/checkout-preview', params);
  if (!data.success) throw new Error(data.message || 'Không thể tính toán chi phí đơn hàng');
  return data.data;
}

