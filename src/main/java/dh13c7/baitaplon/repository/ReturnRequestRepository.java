package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.ReturnRequest;
import dh13c7.baitaplon.model.ReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {
    Page<ReturnRequest> findByCustomer_IdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    
    @Query("SELECT r FROM ReturnRequest r WHERE (:status IS NULL OR r.status = :status)")
    Page<ReturnRequest> searchAdmin(@Param("status") ReturnStatus status, Pageable pageable);

    List<ReturnRequest> findByOrder_Id(Long orderId);
}
