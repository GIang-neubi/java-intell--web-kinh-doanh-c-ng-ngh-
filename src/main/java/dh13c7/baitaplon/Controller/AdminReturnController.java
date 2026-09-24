package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.ReturnRequestDTO;
import dh13c7.baitaplon.model.ReturnStatus;
import dh13c7.baitaplon.service.ReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/returns")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminReturnController {

    private final ReturnService returnService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReturnRequestDTO>>> getReturnRequests(
            @RequestParam(required = false) ReturnStatus status,
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize) {
        PageResponse<ReturnRequestDTO> result = returnService.searchAdminReturns(status, pageNo, pageSize);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách trả hàng thành công", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReturnRequestDTO>> getReturnRequestById(@PathVariable Long id) {
        ReturnRequestDTO result = returnService.getReturnRequestById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết trả hàng thành công", result));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ReturnRequestDTO>> updateReturnStatus(
            @PathVariable Long id,
            @RequestParam ReturnStatus status,
            @RequestParam(required = false) String adminNote) {
        ReturnRequestDTO result = returnService.updateReturnStatus(id, status, adminNote);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật trạng thái trả hàng thành công", result));
    }
}
