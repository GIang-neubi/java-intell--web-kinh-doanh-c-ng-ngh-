package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);
    List<Review> findByProductId(Long productId);
    void deleteByProductId(Long productId);
    boolean existsByProductIdAndUserId(Long productId, Long userId);
}
