package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Delivery;
import dh13c7.baitaplon.model.DeliveryStatus;
import dh13c7.baitaplon.model.ShippingMethod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    Optional<Delivery> findByOrderId(Long orderId);

    boolean existsByOrderId(Long orderId);

    Page<Delivery> findByShipperId(Long shipperId, Pageable pageable);

    List<Delivery> findByShipperIdOrderByCreatedAtDesc(Long shipperId);

    Page<Delivery> findByShipperIdAndStatus(Long shipperId, DeliveryStatus status, Pageable pageable);

    long countByStatus(DeliveryStatus status);

    long countByShipperId(Long shipperId);

    long countByShipperIdAndStatusIn(Long shipperId, Collection<DeliveryStatus> statuses);

    @Query("SELECT d FROM Delivery d WHERE " +
           "(:keyword IS NULL OR LOWER(d.order.orderCode) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
           "  OR LOWER(d.receiverName) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
           "  OR LOWER(d.receiverPhone) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
           "  OR LOWER(d.deliveryAddress) LIKE LOWER(CONCAT('%',:keyword,'%'))) " +
           "AND (:status IS NULL OR d.status = :status) " +
           "AND (:shipperId IS NULL OR d.shipper.id = :shipperId) " +
           "AND (:shippingMethod IS NULL OR d.shippingMethod = :shippingMethod) " +
           "ORDER BY d.createdAt DESC")
    Page<Delivery> searchDeliveries(
            @Param("keyword") String keyword,
            @Param("status") DeliveryStatus status,
            @Param("shipperId") Long shipperId,
            @Param("shippingMethod") ShippingMethod shippingMethod,
            Pageable pageable);

    @Query("SELECT d FROM Delivery d JOIN FETCH d.order o WHERE o.paymentMethod = 'COD' AND d.status = 'DELIVERED'")
    List<Delivery> findAllDeliveredCodDeliveries();

    @Query("SELECT d FROM Delivery d JOIN FETCH d.order o WHERE d.shipper.id = :shipperId AND o.paymentMethod = 'COD' AND d.status = 'DELIVERED'")
    List<Delivery> findDeliveredCodDeliveriesByShipper(@Param("shipperId") Long shipperId);
}

