package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.delivery.*;
import dh13c7.baitaplon.model.DeliveryStatus;
import dh13c7.baitaplon.model.ShippingMethod;
import dh13c7.baitaplon.service.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/deliveries")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDeliveryController {

    private final DeliveryService deliveryService;

    /**
     * Admin: Tìm kiếm, lọc và phân trang danh sách phiếu giao hàng
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DeliveryResponse>>> searchDeliveries(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) DeliveryStatus status,
            @RequestParam(required = false) Long shipperId,
            @RequestParam(required = false) ShippingMethod shippingMethod,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<DeliveryResponse> result = deliveryService.searchDeliveries(
                keyword, status, shipperId, shippingMethod, page, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách phiếu giao hàng thành công", result));
    }

    /**
     * Admin: Lấy chi tiết phiếu giao hàng
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DeliveryDetailResponse>> getDeliveryDetail(@PathVariable Long id) {
        DeliveryDetailResponse detail = deliveryService.getDeliveryDetailById(id, null, true, false);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết phiếu giao hàng thành công", detail));
    }

    /**
     * Admin: Phân công hoặc chuyển đổi Shipper cho phiếu giao
     */
    @PostMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<DeliveryResponse>> assignShipper(
            @PathVariable Long id,
            @Valid @RequestBody AssignShipperRequest request
    ) {
        DeliveryResponse response = deliveryService.assignShipper(id, request.getShipperId(), request.getNote());
        return ResponseEntity.ok(new ApiResponse<>(true, "Phân công Shipper thành công", response));
    }

    /**
     * Admin: Danh sách tài khoản Shipper và thống kê số đơn
     */
    @GetMapping("/shippers")
    public ResponseEntity<ApiResponse<List<ShipperSummaryDTO>>> getShippers() {
        List<ShipperSummaryDTO> shippers = deliveryService.getShipperSummaries();
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách shipper thành công", shippers));
    }

    /**
     * Admin: Thống kê tổng quan tình hình giao vận
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DeliveryStatsResponse>> getDeliveryStats() {
        DeliveryStatsResponse stats = deliveryService.getDeliveryStats();
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thống kê giao vận thành công", stats));
    }

    /**
     * Admin: Xem báo cáo đối soát tiền mặt COD toàn hệ thống
     */
    @GetMapping("/cod-reconciliation")
    public ResponseEntity<ApiResponse<CodReconciliationResponse>> getCodReconciliation() {
        CodReconciliationResponse result = deliveryService.getCodReconciliation();
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy dữ liệu đối soát COD thành công", result));
    }

    /**
     * Admin: Xác nhận đã nhận nộp tiền mặt COD của 1 đơn hàng
     */
    @PostMapping("/{id}/settle-cod")
    public ResponseEntity<ApiResponse<DeliveryResponse>> settleDeliveryCod(
            @PathVariable Long id,
            @RequestBody(required = false) CodSettlementRequest request
    ) {
        String note = request != null ? request.getNote() : null;
        DeliveryResponse result = deliveryService.settleDeliveryCod(id, note);
        return ResponseEntity.ok(new ApiResponse<>(true, "Xác nhận đối soát nộp tiền COD thành công", result));
    }

    /**
     * Admin: Xác nhận đối soát quyết toán toàn bộ tiền mặt COD của một Shipper
     */
    @PostMapping("/shippers/{shipperId}/settle-cod")
    public ResponseEntity<ApiResponse<List<DeliveryResponse>>> settleShipperCod(
            @PathVariable Long shipperId,
            @RequestBody(required = false) CodSettlementRequest request
    ) {
        String note = request != null ? request.getNote() : null;
        List<DeliveryResponse> result = deliveryService.settleShipperCod(shipperId, note);
        return ResponseEntity.ok(new ApiResponse<>(true, "Đối soát toàn bộ COD shipper thành công", result));
    }

    /**
     * Admin: Lên lịch và kích hoạt giao lại cho đơn hàng giao thất bại
     */
    @PostMapping("/{id}/redeliver")
    public ResponseEntity<ApiResponse<DeliveryResponse>> reDeliver(
            @PathVariable Long id,
            @RequestBody(required = false) ReDeliverRequest request
    ) {
        DeliveryResponse result = deliveryService.reDeliver(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lên lịch giao lại thành công", result));
    }

    /**
     * Admin: Hoàn hàng về kho và hủy đơn hàng khi không thể giao
     */
    @PostMapping("/{id}/return-to-warehouse")
    public ResponseEntity<ApiResponse<DeliveryResponse>> returnToWarehouse(
            @PathVariable Long id,
            @RequestBody(required = false) ReturnWarehouseRequest request
    ) {
        DeliveryResponse result = deliveryService.returnToWarehouse(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Hoàn hàng về kho H&G thành công", result));
    }
}

