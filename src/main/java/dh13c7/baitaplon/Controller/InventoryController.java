package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.InventoryImportRequest;
import dh13c7.baitaplon.dto.InventoryLogResponse;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class InventoryController {
    
    private final InventoryService inventoryService;

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<Void>> importInventory(
            @Valid @RequestBody InventoryImportRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        inventoryService.importInventory(request, userDetails.getId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Nhập kho thành công", null));
    }

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<Page<InventoryLogResponse>>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<InventoryLogResponse> logs = inventoryService.getLogs(PageRequest.of(page, size));
        return ResponseEntity.ok(new ApiResponse<>(true, "Thành công", logs));
    }
}
