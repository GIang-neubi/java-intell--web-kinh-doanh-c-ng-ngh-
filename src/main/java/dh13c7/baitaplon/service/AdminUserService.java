package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.AdminUserDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.model.Role;

public interface AdminUserService {
    PageResponse<AdminUserDTO> getUsers(String keyword, Role role, int pageNo, int pageSize);
    AdminUserDTO getUserById(Long id);
    AdminUserDTO toggleUserStatus(Long id);
    AdminUserDTO updateUserRole(Long id, Role role);
}
