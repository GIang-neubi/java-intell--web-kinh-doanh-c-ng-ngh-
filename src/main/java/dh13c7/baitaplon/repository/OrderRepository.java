package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Order;
import dh13c7.baitaplon.model.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByOrderCode(String orderCode);

    List<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(OrderStatus status);

    // Admin: search + filter + pagination
    @Query("SELECT o FROM Order o WHERE " +
           "(:keyword IS NULL OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
           "  OR LOWER(o.user.username) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
           "  OR LOWER(o.user.fullName) LIKE LOWER(CONCAT('%',:keyword,'%'))) " +
           "AND (:status IS NULL OR o.status = :status) " +
           "ORDER BY o.createdAt DESC")
    Page<Order> searchOrders(@Param("keyword") String keyword,
                             @Param("status") OrderStatus status,
                             Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND " +
           "(:keyword IS NULL OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%',:keyword,'%'))) " +
           "AND (:status IS NULL OR o.status = :status) " +
           "ORDER BY o.createdAt DESC")
    Page<Order> searchOrdersByUser(@Param("userId") Long userId,
                                   @Param("keyword") String keyword,
                                   @Param("status") OrderStatus status,
                                   Pageable pageable);

    // Reports: revenue by range (day granularity)
    @Query("""
            SELECT FUNCTION('DATE', o.createdAt), COALESCE(SUM(o.totalAmount), 0), COUNT(o)
            FROM Order o
            WHERE o.createdAt >= :from AND o.createdAt <= :to AND o.status <> :cancelled
            GROUP BY FUNCTION('DATE', o.createdAt)
            ORDER BY FUNCTION('DATE', o.createdAt)
            """)
    List<Object[]> revenueByRange(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("cancelled") OrderStatus cancelled);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.createdAt >= :from AND o.createdAt <= :to AND o.status <> :cancelled")
    BigDecimal sumRevenueByRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to, @Param("cancelled") OrderStatus cancelled);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    long countByStatusQuery(@Param("status") OrderStatus status);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status <> :cancelled")
    BigDecimal sumRevenueExcludingCancelled(@Param("cancelled") OrderStatus cancelled);

    @Query("""
            SELECT FUNCTION('DATE', o.createdAt), COALESCE(SUM(o.totalAmount), 0), COUNT(o)
            FROM Order o
            WHERE o.createdAt >= :from AND o.status <> :cancelled
            GROUP BY FUNCTION('DATE', o.createdAt)
            ORDER BY FUNCTION('DATE', o.createdAt)
            """)
    List<Object[]> revenueAndCountByDay(
            @Param("from") LocalDateTime from,
            @Param("cancelled") OrderStatus cancelled);

    @Query("""
            SELECT FUNCTION('DATE', o.createdAt), COUNT(o)
            FROM Order o
            WHERE o.createdAt >= :from
            GROUP BY FUNCTION('DATE', o.createdAt)
            ORDER BY FUNCTION('DATE', o.createdAt)
            """)
    List<Object[]> orderCountByDay(@Param("from") LocalDateTime from);
}
