package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    // ─── Queries cũ (giữ nguyên tương thích) ───────────────────────────────
    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);
    List<Review> findByProductId(Long productId);
    void deleteByProductId(Long productId);
    boolean existsByProductIdAndUserId(Long productId, Long userId);

    // ─── Phân trang ─────────────────────────────────────────────────────────
    Page<Review> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);
    Page<Review> findByProductIdAndRatingOrderByCreatedAtDesc(Long productId, int rating, Pageable pageable);
    Page<Review> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // ─── Thống kê ───────────────────────────────────────────────────────────
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId")
    Optional<Double> findAvgRatingByProductId(@Param("productId") Long productId);

    long countByProductId(Long productId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.product.id = :productId GROUP BY r.rating")
    List<Object[]> findRatingDistributionByProductId(@Param("productId") Long productId);
}
