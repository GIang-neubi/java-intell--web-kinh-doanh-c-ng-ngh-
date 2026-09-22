package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
    List<User> findByRole(Role role);

    // Admin: tìm kiếm + lọc role có phân trang
    @Query("SELECT u FROM User u WHERE " +
           "(:keyword IS NULL OR LOWER(u.username) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
           "  OR LOWER(u.email) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
           "  OR LOWER(u.fullName) LIKE LOWER(CONCAT('%',:keyword,'%'))) " +
           "AND (:role IS NULL OR u.role = :role)")
    Page<User> searchUsers(@Param("keyword") String keyword,
                           @Param("role") Role role,
                           Pageable pageable);

    // Đếm số admin đang enabled (bảo vệ admin cuối)
    long countByRoleAndEnabledTrue(Role role);
}
