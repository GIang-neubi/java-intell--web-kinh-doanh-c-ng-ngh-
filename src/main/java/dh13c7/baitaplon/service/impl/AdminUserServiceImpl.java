package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.AdminUserDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminUserDTO> getUsers(String keyword, Role role, int pageNo, int pageSize) {
        Pageable pageable = PageRequest.of(pageNo, pageSize, Sort.by("createdAt").descending());
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        Page<User> page = userRepository.searchUsers(kw, role, pageable);
        List<AdminUserDTO> content = page.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + id));
        return mapToDTO(user);
    }

    @Override
    @Transactional
    public AdminUserDTO toggleUserStatus(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + id));

        // Bảo vệ: không cho khóa admin cuối cùng đang hoạt động
        if (user.isEnabled() && user.getRole() == Role.ROLE_ADMIN) {
            long activeAdminCount = userRepository.countByRoleAndEnabledTrue(Role.ROLE_ADMIN);
            if (activeAdminCount <= 1) {
                throw new BadRequestException(
                        "Không thể khóa tài khoản admin cuối cùng. Vui lòng tạo admin khác trước.");
            }
        }

        user.setEnabled(!user.isEnabled());
        return mapToDTO(userRepository.save(user));
    }

    @Override
    @Transactional
    public AdminUserDTO updateUserRole(Long id, Role role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + id));

        // Bảo vệ: không cho hạ quyền admin cuối
        if (user.getRole() == Role.ROLE_ADMIN && role != Role.ROLE_ADMIN) {
            long adminCount = userRepository.countByRoleAndEnabledTrue(Role.ROLE_ADMIN);
            if (adminCount <= 1) {
                throw new BadRequestException(
                        "Không thể thay đổi quyền của admin cuối cùng. Vui lòng tạo admin khác trước.");
            }
        }

        user.setRole(role);
        return mapToDTO(userRepository.save(user));
    }

    private AdminUserDTO mapToDTO(User user) {
        return new AdminUserDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getFullName(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
