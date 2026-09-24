package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Refund;
import dh13c7.baitaplon.model.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RefundRepository extends JpaRepository<Refund, Long> {
    Page<Refund> findByOrder_User_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    @Query("SELECT r FROM Refund r WHERE (:status IS NULL OR r.status = :status)")
    Page<Refund> searchAdmin(@Param("status") RefundStatus status, Pageable pageable);

    Optional<Refund> findByOrder_Id(Long orderId);
}
