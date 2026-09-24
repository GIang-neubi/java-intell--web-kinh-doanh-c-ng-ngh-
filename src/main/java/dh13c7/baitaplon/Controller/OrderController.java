package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.CheckoutRequest;
import dh13c7.baitaplon.dto.OrderDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.model.OrderStatus;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        throw new BadCredentialsException("Vui lòng đăng nhập để thực hiện thao tác đơn hàng.");
    }

    // ================= USER APIs =================

    @PostMapping("/checkout-preview")
    public ResponseEntity<ApiResponse<dh13c7.baitaplon.dto.CheckoutPreviewResponse>> previewCheckout(
            @RequestBody(required = false) dh13c7.baitaplon.dto.CheckoutPreviewRequest request) {
        dh13c7.baitaplon.dto.CheckoutPreviewResponse response = orderService.calculateCheckoutPreview(
                getCurrentUserId(),
                request != null ? request : new dh13c7.baitaplon.dto.CheckoutPreviewRequest()
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Tính toán chi phí đơn hàng thành công", response));
    }

    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderDTO>> checkout(@Valid @RequestBody CheckoutRequest request) {
        OrderDTO order = orderService.checkout(getCurrentUserId(), request);
        return new ResponseEntity<>(new ApiResponse<>(true, "Đặt hàng thành công", order), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderDTO>>> getOrders() {
        List<OrderDTO> orders = orderService.getMyOrders(getCurrentUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách đơn hàng thành công", orders));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<OrderDTO>>> getMyOrders() {
        List<OrderDTO> orders = orderService.getMyOrders(getCurrentUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách đơn hàng thành công", orders));
    }

    @GetMapping("/me/search")
    public ResponseEntity<ApiResponse<PageResponse<OrderDTO>>> searchMyOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize) {
        PageResponse<OrderDTO> page = orderService.searchMyOrders(
                getCurrentUserId(), keyword, status, pageNo, pageSize);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách đơn hàng thành công", page));
    }

    @GetMapping("/me/{id}")
    public ResponseEntity<ApiResponse<OrderDTO>> getMyOrderById(@PathVariable Long id) {
        OrderDTO order = orderService.getMyOrderById(id, getCurrentUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết đơn hàng thành công", order));
    }

    @PostMapping("/me/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderDTO>> cancelMyOrder(@PathVariable Long id) {
        OrderDTO order = orderService.cancelMyOrder(id, getCurrentUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Hủy đơn hàng thành công", order));
    }

    // ================= ADMIN APIs =================

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDTO>> getOrderById(@PathVariable Long id) {
        OrderDTO order = orderService.getOrderById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết đơn hàng thành công", order));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderDTO>> updateOrderStatus(@PathVariable Long id, @RequestParam OrderStatus status) {
        OrderDTO order = orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật trạng thái đơn hàng thành công", order));
    }
}
