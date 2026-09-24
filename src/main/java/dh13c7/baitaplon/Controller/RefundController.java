package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.RefundDTO;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        throw new BadCredentialsException("Vui lòng đăng nhập.");
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RefundDTO>>> getMyRefunds(
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize) {
        PageResponse<RefundDTO> result = refundService.getMyRefunds(getCurrentUserId(), pageNo, pageSize);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách hoàn tiền thành công", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RefundDTO>> getMyRefundById(@PathVariable Long id) {
        RefundDTO result = refundService.getMyRefundById(id, getCurrentUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết hoàn tiền thành công", result));
    }
}
