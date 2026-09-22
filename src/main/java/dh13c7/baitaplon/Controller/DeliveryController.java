package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.delivery.DeliveryDetailResponse;
import dh13c7.baitaplon.dto.delivery.DeliveryResponse;
import dh13c7.baitaplon.dto.delivery.DeliveryTrackingDTO;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.DeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deliveries")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService deliveryService;

    private UserDetailsImpl getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails;
        }
        throw new BadCredentialsException("Vui lòng đăng nhập để xem thông tin vận chuyển");
    }

    private boolean checkAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean checkShipper() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHIPPER"));
    }

    /**
     * Lấy chi tiết vận chuyển theo orderId (khách hàng xem đơn của mình hoặc Admin)
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<DeliveryDetailResponse>> getDeliveryByOrderId(@PathVariable Long orderId) {
        UserDetailsImpl user = getCurrentUser();
        boolean isAdmin = checkAdmin();
        DeliveryDetailResponse detail = deliveryService.getDeliveryDetailByOrderId(orderId, user.getId(), isAdmin);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thông tin vận chuyển thành công", detail));
    }

    /**
     * Lấy chi tiết vận chuyển theo deliveryId
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DeliveryDetailResponse>> getDeliveryById(@PathVariable Long id) {
        UserDetailsImpl user = getCurrentUser();
        boolean isAdmin = checkAdmin();
        boolean isShipper = checkShipper();
        DeliveryDetailResponse detail = deliveryService.getDeliveryDetailById(id, user.getId(), isAdmin, isShipper);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thông tin vận chuyển thành công", detail));
    }

    /**
     * Lấy danh sách lộ trình / lịch sử tracking của đơn hàng
     */
    @GetMapping("/{id}/tracking")
    public ResponseEntity<ApiResponse<List<DeliveryTrackingDTO>>> getDeliveryTrackings(@PathVariable Long id) {
        UserDetailsImpl user = getCurrentUser();
        boolean isAdmin = checkAdmin();
        boolean isShipper = checkShipper();
        List<DeliveryTrackingDTO> trackings = deliveryService.getDeliveryTrackings(id, user.getId(), isAdmin, isShipper);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy lộ trình vận chuyển thành công", trackings));
    }

    /**
     * Khách hàng tự xác nhận đã nhận hàng
     */
    @PostMapping("/{id}/confirm-received")
    public ResponseEntity<ApiResponse<DeliveryResponse>> customerConfirmReceived(@PathVariable Long id) {
        UserDetailsImpl user = getCurrentUser();
        DeliveryResponse response = deliveryService.customerConfirmReceived(id, user.getId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Xác nhận đã nhận hàng thành công", response));
    }
}
