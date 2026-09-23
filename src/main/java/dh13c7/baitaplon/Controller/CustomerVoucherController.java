package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.CustomerVoucherResponse;
import dh13c7.baitaplon.dto.VoucherDTO;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class CustomerVoucherController {

    private final VoucherService voucherService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        return null;
    }

    /**
     * Lấy danh sách mã giảm giá của tôi
     * @param status bộ lọc: ALL (mặc định), AVAILABLE, USED, EXPIRED
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<CustomerVoucherResponse>>> getMyVouchers(
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        Long userId = getCurrentUserId();
        List<CustomerVoucherResponse> vouchers = voucherService.getMyVouchers(userId, status);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách mã giảm giá thành công", vouchers));
    }

    /**
     * Lấy danh sách các mã giảm giá đang khả dụng để khách chọn khi mua sắm / thanh toán
     */
    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<CustomerVoucherResponse>>> getAvailableVouchers() {
        Long userId = getCurrentUserId();
        List<CustomerVoucherResponse> vouchers = voucherService.getMyVouchers(userId, "AVAILABLE");
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách mã giảm giá khả dụng thành công", vouchers));
    }

    /**
     * Kiểm tra tính hợp lệ của mã giảm giá khi khách hàng nhập mã
     */
    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<VoucherDTO>> validateVoucher(
            @RequestParam String code,
            @RequestParam(defaultValue = "0") BigDecimal orderAmount) {
        VoucherDTO dto = voucherService.validateForCheckout(code, orderAmount);
        return ResponseEntity.ok(new ApiResponse<>(true, "Mã giảm giá hợp lệ", dto));
    }
}
