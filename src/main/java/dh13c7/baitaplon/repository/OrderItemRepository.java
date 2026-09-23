package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.OrderItem;
import dh13c7.baitaplon.model.OrderStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderId(Long orderId);

    boolean existsByProductId(Long productId);

    /** Kiểm tra user đã từng mua sản phẩm (bất kỳ trạng thái đơn nào) */
    boolean existsByProductIdAndOrderUserId(Long productId, Long userId);

    @Query("""
            SELECT oi.product.id, oi.product.name, oi.product.image,
                   SUM(oi.quantity), SUM(oi.price * oi.quantity)
            FROM OrderItem oi
            WHERE oi.order.status <> :cancelled
            GROUP BY oi.product.id, oi.product.name, oi.product.image
            ORDER BY SUM(oi.quantity) DESC
            """)
    List<Object[]> findTopSellingProducts(@Param("cancelled") OrderStatus cancelled, Pageable pageable);
}
