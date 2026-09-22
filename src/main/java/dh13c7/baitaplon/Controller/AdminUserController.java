package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.AdminUserDTO;
import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    /** Lấy danh sách người dùng (có tìm kiếm + lọc role + phân trang) */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminUserDTO>>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Role role,
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize
    ) {
        PageResponse<AdminUserDTO> result = adminUserService.getUsers(keyword, role, pageNo, pageSize);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách người dùng thành công", result));
    }

    /** Chi tiết 1 người dùng */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserDTO>> getUserById(@PathVariable Long id) {
        AdminUserDTO user = adminUserService.getUserById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thông tin người dùng thành công", user));
    }

    /** Khóa / Mở khóa tài khoản */
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserDTO>> toggleStatus(@PathVariable Long id) {
        AdminUserDTO user = adminUserService.toggleUserStatus(id);
        String msg = user.isEnabled() ? "Đã mở khóa tài khoản thành công" : "Đã khóa tài khoản thành công";
        return ResponseEntity.ok(new ApiResponse<>(true, msg, user));
    }

    /** Thay đổi role */
    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<AdminUserDTO>> updateRole(
            @PathVariable Long id,
            @RequestParam Role role
    ) {
        AdminUserDTO user = adminUserService.updateUserRole(id, role);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật quyền thành công", user));
    }
}
