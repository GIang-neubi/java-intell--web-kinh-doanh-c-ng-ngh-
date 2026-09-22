package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.warehouse.WarehouseDetailResponse;
import dh13c7.baitaplon.dto.warehouse.WarehouseRequest;
import dh13c7.baitaplon.dto.warehouse.WarehouseResponse;
import dh13c7.baitaplon.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/warehouses")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class WarehouseController {

    private final WarehouseService warehouseService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<WarehouseResponse>>> getAllWarehouses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<WarehouseResponse> warehouses = warehouseService.getAllWarehouses(PageRequest.of(page, size));
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách kho hàng thành công", warehouses));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<WarehouseResponse>>> getActiveWarehouses() {
        List<WarehouseResponse> warehouses = warehouseService.getActiveWarehouses();
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách kho đang hoạt động thành công", warehouses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WarehouseDetailResponse>> getWarehouseById(@PathVariable Long id) {
        WarehouseDetailResponse detail = warehouseService.getWarehouseById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thông tin chi tiết kho hàng thành công", detail));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WarehouseResponse>> createWarehouse(@Valid @RequestBody WarehouseRequest request) {
        WarehouseResponse created = warehouseService.createWarehouse(request);
        return new ResponseEntity<>(new ApiResponse<>(true, "Tạo kho hàng mới thành công", created), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WarehouseResponse>> updateWarehouse(
            @PathVariable Long id,
            @Valid @RequestBody WarehouseRequest request) {
        WarehouseResponse updated = warehouseService.updateWarehouse(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật thông tin kho hàng thành công", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<WarehouseResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Thiếu thông tin status", null));
        }
        WarehouseResponse updated = warehouseService.updateWarehouseStatus(id, status);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật trạng thái kho hàng thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteWarehouse(@PathVariable Long id) {
        warehouseService.deleteWarehouse(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Xóa kho hàng thành công", null));
    }
}
