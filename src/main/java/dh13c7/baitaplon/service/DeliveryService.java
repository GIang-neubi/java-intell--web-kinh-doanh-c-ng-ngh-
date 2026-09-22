package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.delivery.*;
import dh13c7.baitaplon.model.Delivery;
import dh13c7.baitaplon.model.DeliveryStatus;
import dh13c7.baitaplon.model.Order;
import dh13c7.baitaplon.model.ShippingMethod;

import java.math.BigDecimal;
import java.util.List;

public interface DeliveryService {

    /**
     * Tự động khởi tạo bản ghi Delivery ngay khi đơn hàng được tạo thành công
     */
    Delivery createDeliveryForOrder(Order order, ShippingMethod method, BigDecimal fee);

    /**
     * Khởi tạo bản ghi Delivery với đầy đủ thông tin kho xuất phát, khoảng cách và tổng khối lượng
     */
    Delivery createDeliveryForOrder(Order order, ShippingMethod method, BigDecimal fee, dh13c7.baitaplon.model.Warehouse warehouse, Double distanceKm, BigDecimal totalWeightKg);

    /**
     * Lấy chi tiết vận chuyển theo orderId (Khách hàng hoặc Admin)
     */
    DeliveryDetailResponse getDeliveryDetailByOrderId(Long orderId, Long currentUserId, boolean isAdmin);

    /**
     * Lấy chi tiết vận chuyển theo deliveryId
     */
    DeliveryDetailResponse getDeliveryDetailById(Long deliveryId, Long currentUserId, boolean isAdmin, boolean isShipper);

    /**
     * Lấy toàn bộ timeline lộ trình của phiếu giao
     */
    List<DeliveryTrackingDTO> getDeliveryTrackings(Long deliveryId, Long currentUserId, boolean isAdmin, boolean isShipper);

    /**
     * Admin: Tìm kiếm, lọc theo trạng thái, shipper, phương thức, phân trang
     */
    PageResponse<DeliveryResponse> searchDeliveries(
            String keyword, DeliveryStatus status, Long shipperId, ShippingMethod shippingMethod, int pageNo, int pageSize);

    /**
     * Shipper: Lấy danh sách các đơn hàng được gán cho mình
     */
    PageResponse<DeliveryResponse> getMyShipperDeliveries(Long shipperId, DeliveryStatus status, int pageNo, int pageSize);

    /**
     * Admin: Phân công hoặc đổi Shipper cho đơn hàng
     */
    DeliveryResponse assignShipper(Long deliveryId, Long shipperId, String note);

    /**
     * Shipper: Nhận đơn hàng được gán
     */
    DeliveryResponse shipperAcceptDelivery(Long deliveryId, Long shipperId);

    /**
     * Shipper: Đã lấy gói hàng từ cửa hàng (Order chuyển PROCESSING/SHIPPING)
     */
    DeliveryResponse shipperPickupPackage(Long deliveryId, Long shipperId);

    /**
     * Shipper: Bắt đầu di chuyển giao tới khách hàng (IN_TRANSIT)
     */
    DeliveryResponse shipperStartDelivery(Long deliveryId, Long shipperId, Double lat, Double lng);

    /**
     * Shipper: Đã đến địa chỉ giao hàng (ARRIVED -> sinh OTP xác nhận)
     */
    DeliveryResponse shipperArrive(Long deliveryId, Long shipperId, Double lat, Double lng);

    /**
     * Shipper: Cập nhật tọa độ GPS định kỳ trong quá trình giao hàng
     */
    DeliveryResponse updateShipperLocation(Long deliveryId, Long shipperId, Double lat, Double lng);

    /**
     * Shipper: Xác thực mã OTP và hoàn tất đơn hàng (DELIVERED)
     */
    DeliveryResponse shipperCompleteDelivery(Long deliveryId, Long shipperId, DeliveryOtpVerifyRequest request);

    /**
     * Shipper: Báo cáo giao hàng không thành công kèm lý do
     */
    DeliveryResponse shipperFailDelivery(Long deliveryId, Long shipperId, DeliveryFailureRequest request);

    /**
     * Khách hàng: Xác nhận đã nhận hàng thành công
     */
    DeliveryResponse customerConfirmReceived(Long deliveryId, Long customerId);

    /**
     * Admin: Danh sách tài khoản Shipper kèm thống kê số đơn phụ trách
     */
    List<ShipperSummaryDTO> getShipperSummaries();

    /**
     * Hủy phiếu giao hàng khi đơn hàng bị hủy
     */
    void cancelDeliveryForOrder(Long orderId, String reason);

    /**
     * Cập nhật ảnh bằng chứng giao hàng
     */
    DeliveryResponse updateProofImage(Long deliveryId, Long shipperId, String proofImage);

    /**
     * Admin: Xem thống kê đối soát thu hộ tiền mặt COD toàn hệ thống
     */
    CodReconciliationResponse getCodReconciliation();

    /**
     * Shipper: Xem thống kê tiền mặt COD đang thu và nộp của bản thân
     */
    ShipperCodSummaryDTO getShipperCodSummary(Long shipperId);

    /**
     * Admin: Xác nhận đã nhận nộp tiền mặt COD của 1 đơn giao hàng cụ thể
     */
    DeliveryResponse settleDeliveryCod(Long deliveryId, String note);

    /**
     * Admin: Xác nhận đối soát và nộp tất cả tiền mặt COD của một Shipper
     */
    List<DeliveryResponse> settleShipperCod(Long shipperId, String note);

    /**
     * Admin: Lên lịch và kích hoạt giao lại cho đơn hàng giao thất bại
     */
    DeliveryResponse reDeliver(Long deliveryId, ReDeliverRequest request);

    /**
     * Admin: Hoàn hàng về kho và hủy đơn hàng khi giao thất bại nhiều lần
     */
    DeliveryResponse returnToWarehouse(Long deliveryId, ReturnWarehouseRequest request);

    /**
     * Admin: Thống kê tổng quan đơn giao hàng
     */
    DeliveryStatsResponse getDeliveryStats();

    /**
     * Shipper: Thống kê các trạng thái đơn giao cho dashboard của Shipper
     */
    ShipperDeliveryStatsResponse getShipperStats(Long shipperId);
}
