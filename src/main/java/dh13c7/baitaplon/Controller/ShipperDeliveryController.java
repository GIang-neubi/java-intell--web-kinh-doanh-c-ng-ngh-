package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.delivery.*;
import dh13c7.baitaplon.model.DeliveryStatus;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.DeliveryService;
import dh13c7.baitaplon.service.FileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/shipper/deliveries")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SHIPPER', 'ADMIN')")
public class ShipperDeliveryController {

    private final DeliveryService deliveryService;
    private final FileStorageService fileStorageService;

    private Long getCurrentShipperId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        throw new BadCredentialsException("Vui lòng đăng nhập với tài khoản Shipper");
    }

    /**
     * Shipper: Xem danh sách các đơn hàng được gán cho mình
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DeliveryResponse>>> getMyDeliveries(
            @RequestParam(required = false) DeliveryStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Long shipperId = getCurrentShipperId();
        PageResponse<DeliveryResponse> result = deliveryService.getMyShipperDeliveries(shipperId, status, page, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách đơn hàng shipper thành công", result));
    }

    /**
     * Shipper: Thống kê trạng thái các đơn hàng cho dashboard
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<ShipperDeliveryStatsResponse>> getMyDeliveryStats() {
        Long shipperId = getCurrentShipperId();
        ShipperDeliveryStatsResponse stats = deliveryService.getShipperStats(shipperId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thống kê đơn giao thành công", stats));
    }

    /**
     * Shipper: Xem chi tiết phiếu giao hàng
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DeliveryDetailResponse>> getDeliveryDetail(@PathVariable Long id) {
        Long shipperId = getCurrentShipperId();
        DeliveryDetailResponse detail = deliveryService.getDeliveryDetailById(id, shipperId, false, true);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết đơn hàng thành công", detail));
    }

    /**
     * Shipper: Nhận đơn hàng đã được phân công
     */
    @PostMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<DeliveryResponse>> acceptDelivery(@PathVariable Long id) {
        Long shipperId = getCurrentShipperId();
        DeliveryResponse response = deliveryService.shipperAcceptDelivery(id, shipperId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Nhận đơn hàng thành công", response));
    }

    /**
     * Shipper: Lấy hàng từ kho/cửa hàng
     */
    @PostMapping("/{id}/pickup")
    public ResponseEntity<ApiResponse<DeliveryResponse>> pickupPackage(@PathVariable Long id) {
        Long shipperId = getCurrentShipperId();
        DeliveryResponse response = deliveryService.shipperPickupPackage(id, shipperId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Đã lấy hàng từ cửa hàng thành công", response));
    }

    /**
     * Shipper: Bắt đầu di chuyển giao tới khách hàng (IN_TRANSIT)
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<DeliveryResponse>> startDelivery(
            @PathVariable Long id,
            @RequestBody(required = false) DeliveryLocationRequest location
    ) {
        Long shipperId = getCurrentShipperId();
        Double lat = location != null ? location.getLatitude() : null;
        Double lng = location != null ? location.getLongitude() : null;
        DeliveryResponse response = deliveryService.shipperStartDelivery(id, shipperId, lat, lng);
        return ResponseEntity.ok(new ApiResponse<>(true, "Bắt đầu giao hàng tới khách", response));
    }

    /**
     * Shipper: Đã đến địa chỉ giao hàng (ARRIVED)
     */
    @PostMapping("/{id}/arrive")
    public ResponseEntity<ApiResponse<DeliveryResponse>> arriveAtDestination(
            @PathVariable Long id,
            @RequestBody(required = false) DeliveryLocationRequest location
    ) {
        Long shipperId = getCurrentShipperId();
        Double lat = location != null ? location.getLatitude() : null;
        Double lng = location != null ? location.getLongitude() : null;
        DeliveryResponse response = deliveryService.shipperArrive(id, shipperId, lat, lng);
        return ResponseEntity.ok(new ApiResponse<>(true, "Đã tới địa chỉ giao hàng.", response));
    }

    /**
     * Shipper: Cập nhật tọa độ GPS thời gian thực trong quá trình giao hàng
     */
    @PostMapping("/{id}/location")
    public ResponseEntity<ApiResponse<DeliveryResponse>> updateDeliveryLocation(
            @PathVariable Long id,
            @RequestBody DeliveryLocationRequest location
    ) {
        Long shipperId = getCurrentShipperId();
        Double lat = location != null ? location.getLatitude() : null;
        Double lng = location != null ? location.getLongitude() : null;
        DeliveryResponse response = deliveryService.updateShipperLocation(id, shipperId, lat, lng);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật vị trí GPS thành công", response));
    }

    /**
     * Shipper: Hoàn tất giao hàng (DELIVERED) — không cần OTP
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<DeliveryResponse>> completeDelivery(
            @PathVariable Long id,
            @RequestBody(required = false) DeliveryOtpVerifyRequest request
    ) {
        Long shipperId = getCurrentShipperId();
        DeliveryResponse response = deliveryService.shipperCompleteDelivery(id, shipperId, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Giao hàng thành công!", response));
    }

    /**
     * Shipper: Báo cáo giao hàng thất bại kèm lý do
     */
    @PostMapping("/{id}/fail")
    public ResponseEntity<ApiResponse<DeliveryResponse>> failDelivery(
            @PathVariable Long id,
            @Valid @RequestBody DeliveryFailureRequest request
    ) {
        Long shipperId = getCurrentShipperId();
        DeliveryResponse response = deliveryService.shipperFailDelivery(id, shipperId, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Đã ghi nhận giao hàng không thành công", response));
    }

    /**
     * Shipper: Tải ảnh bằng chứng giao hàng (Proof of Delivery)
     */
    @PostMapping("/upload-proof")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadProofImage(
            @RequestParam("file") MultipartFile file
    ) {
        String url = fileStorageService.storeProductImage(file);
        return ResponseEntity.ok(new ApiResponse<>(true, "Tải ảnh bằng chứng thành công", Map.of("url", url)));
    }

    /**
     * Shipper: Cập nhật đường dẫn ảnh bằng chứng cho phiếu giao
     */
    @PostMapping("/{id}/proof")
    public ResponseEntity<ApiResponse<DeliveryResponse>> updateProof(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        Long shipperId = getCurrentShipperId();
        String proofImage = body != null ? body.get("proofImage") : null;
        DeliveryResponse response = deliveryService.updateProofImage(id, shipperId, proofImage);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật ảnh bằng chứng thành công", response));
    }

    /**
     * Shipper: Xem tổng kết tiền mặt COD đã thu và đang giữ cần nộp
     */
    @GetMapping("/cod-summary")
    public ResponseEntity<ApiResponse<ShipperCodSummaryDTO>> getMyCodSummary() {
        Long shipperId = getCurrentShipperId();
        ShipperCodSummaryDTO result = deliveryService.getShipperCodSummary(shipperId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy tổng kết tiền COD thành công", result));
    }
}

