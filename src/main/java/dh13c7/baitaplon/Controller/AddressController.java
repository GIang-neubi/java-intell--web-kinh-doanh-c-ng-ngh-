package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.address.AddressRequest;
import dh13c7.baitaplon.dto.address.AddressResponse;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.AddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        throw new IllegalStateException("Người dùng chưa xác thực");
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AddressResponse>>> getUserAddresses() {
        Long userId = getCurrentUserId();
        List<AddressResponse> addresses = addressService.getUserAddresses(userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách địa chỉ thành công", addresses));
    }

    @GetMapping("/default")
    public ResponseEntity<ApiResponse<AddressResponse>> getDefaultAddress() {
        Long userId = getCurrentUserId();
        AddressResponse address = addressService.getDefaultAddress(userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy địa chỉ mặc định thành công", address));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressResponse>> getAddressById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        AddressResponse address = addressService.getAddressById(id, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết địa chỉ thành công", address));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AddressResponse>> createAddress(@Valid @RequestBody AddressRequest request) {
        Long userId = getCurrentUserId();
        AddressResponse created = addressService.createAddress(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Thêm địa chỉ mới thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressResponse>> updateAddress(
            @PathVariable Long id,
            @Valid @RequestBody AddressRequest request) {
        Long userId = getCurrentUserId();
        AddressResponse updated = addressService.updateAddress(id, userId, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật địa chỉ thành công", updated));
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<ApiResponse<AddressResponse>> setDefaultAddress(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        AddressResponse address = addressService.setDefaultAddress(id, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Đặt làm địa chỉ mặc định thành công", address));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        addressService.deleteAddress(id, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Xóa địa chỉ thành công", null));
    }
}
