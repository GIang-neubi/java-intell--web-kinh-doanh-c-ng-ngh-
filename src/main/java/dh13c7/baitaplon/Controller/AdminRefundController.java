package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.RefundDTO;
import dh13c7.baitaplon.model.RefundStatus;
import dh13c7.baitaplon.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/refunds")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminRefundController {

    private final RefundService refundService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RefundDTO>>> searchAdminRefunds(
            @RequestParam(required = false) RefundStatus status,
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize) {
        PageResponse<RefundDTO> result = refundService.searchAdminRefunds(status, pageNo, pageSize);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách hoàn tiền thành công", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RefundDTO>> getRefundById(@PathVariable Long id) {
        RefundDTO result = refundService.getRefundById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết hoàn tiền thành công", result));
    }

    @PutMapping("/{id}/process")
    public ResponseEntity<ApiResponse<RefundDTO>> processRefund(
            @PathVariable Long id,
            @RequestParam RefundStatus status,
            @RequestParam(required = false) String transactionRef,
            @RequestParam(required = false) String adminNote) {
        RefundDTO result = refundService.processRefund(id, status, transactionRef, adminNote);
        return ResponseEntity.ok(new ApiResponse<>(true, "Xử lý hoàn tiền thành công", result));
    }
}
