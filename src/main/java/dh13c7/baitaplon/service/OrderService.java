package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.CheckoutPreviewRequest;
import dh13c7.baitaplon.dto.CheckoutPreviewResponse;
import dh13c7.baitaplon.dto.CheckoutRequest;
import dh13c7.baitaplon.dto.OrderDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.model.OrderStatus;

import java.util.List;

public interface OrderService {
    CheckoutPreviewResponse calculateCheckoutPreview(Long userId, CheckoutPreviewRequest request);
    OrderDTO checkout(Long userId, CheckoutRequest request);
    List<OrderDTO> getMyOrders(Long userId);
    OrderDTO getOrderById(Long orderId);
    OrderDTO getMyOrderById(Long orderId, Long userId);
    OrderDTO updateOrderStatus(Long orderId, OrderStatus status);
    List<OrderDTO> getRecentOrders(int limit);
    List<OrderDTO> getAllOrders();
    PageResponse<OrderDTO> searchOrders(String keyword, OrderStatus status, int pageNo, int pageSize);
    PageResponse<OrderDTO> searchMyOrders(Long userId, String keyword, OrderStatus status, int pageNo, int pageSize);
}
