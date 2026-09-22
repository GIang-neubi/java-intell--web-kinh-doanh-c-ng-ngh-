package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.DeliveryTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliveryTrackingRepository extends JpaRepository<DeliveryTracking, Long> {

    List<DeliveryTracking> findByDeliveryIdOrderByCreatedAtAsc(Long deliveryId);
}
