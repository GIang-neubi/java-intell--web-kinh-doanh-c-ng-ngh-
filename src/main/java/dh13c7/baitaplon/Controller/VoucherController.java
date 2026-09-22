package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.VoucherDTO;
import dh13c7.baitaplon.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<VoucherDTO>>> getVouchers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize
    ) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách voucher thành công",
                voucherService.getVouchers(keyword, active, pageNo, pageSize)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VoucherDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", voucherService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VoucherDTO>> create(@Valid @RequestBody VoucherDTO dto) {
        return new ResponseEntity<>(new ApiResponse<>(true, "Tạo voucher thành công",
                voucherService.create(dto)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VoucherDTO>> update(
            @PathVariable Long id, @Valid @RequestBody VoucherDTO dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật voucher thành công",
                voucherService.update(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        voucherService.delete(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Xóa voucher thành công", null));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<VoucherDTO>> toggle(@PathVariable Long id) {
        VoucherDTO result = voucherService.toggleActive(id);
        String msg = result.getActive() ? "Đã kích hoạt voucher" : "Đã vô hiệu hóa voucher";
        return ResponseEntity.ok(new ApiResponse<>(true, msg, result));
    }

    /** Public: validate voucher trước khi checkout */
    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<VoucherDTO>> validateVoucher(
            @RequestParam String code,
            @RequestParam(defaultValue = "0") java.math.BigDecimal orderAmount
    ) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Voucher hợp lệ",
                voucherService.validateForCheckout(code, orderAmount)));
    }
}
