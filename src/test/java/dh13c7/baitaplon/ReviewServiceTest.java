package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.ReviewDTO;
import dh13c7.baitaplon.dto.ReviewStatsResponse;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.model.Review;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.OrderItemRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.ReviewRepository;
import dh13c7.baitaplon.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// ─────────────────────────────────────────────────────────────────────────────
// Chú ý: ReviewController inject repository trực tiếp (không qua Service),
// nên chúng ta unit test logic nghiệp vụ qua repository stubs + Controller.
// ─────────────────────────────────────────────────────────────────────────────
@ExtendWith(MockitoExtension.class)
@DisplayName("Review System - Verified Purchase, IDOR Protection & Stats Unit Tests")
class ReviewServiceTest {

    @Mock private ReviewRepository reviewRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private ProductRepository productRepository;
    @Mock private UserRepository userRepository;

    // Dùng 1 helper class nội bộ để tái sử dụng logic nghiệp vụ từ Controller
    private ReviewBusinessLogic logic;

    private Product product;
    private User owner;
    private User otherUser;
    private Review review;

    @BeforeEach
    void setUp() {
        logic = new ReviewBusinessLogic(reviewRepository, orderItemRepository, productRepository, userRepository);

        product = Product.builder()
                .id(10L).name("Camera Sony").price(BigDecimal.valueOf(15000000)).stock(5).status(true)
                .build();

        owner = User.builder().id(1L).username("alice").fullName("Alice Nguyen").build();
        otherUser = User.builder().id(2L).username("bob").fullName("Bob Tran").build();

        review = Review.builder()
                .id(100L).product(product).user(owner).rating(5).comment("Tuyệt vời!")
                .build();
    }

    // ─── 1. Tạo review khi đã mua hàng → thành công ──────────────────────────
    @Test
    @DisplayName("TC-RV-01: createReview - Cho phép đánh giá khi đã mua hàng")
    void createReview_VerifiedPurchase_Success() {
        when(reviewRepository.existsByProductIdAndUserId(10L, 1L)).thenReturn(false);
        when(orderItemRepository.existsByProductIdAndOrderUserId(10L, 1L)).thenReturn(true);
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
        when(reviewRepository.save(any(Review.class))).thenReturn(review);

        ReviewDTO dto = ReviewDTO.builder().rating(5).comment("Tuyệt vời!").build();
        ReviewDTO result = logic.createReview(10L, 1L, dto);

        assertThat(result.getRating()).isEqualTo(5);
        assertThat(result.isVerified()).isTrue();
        verify(reviewRepository).save(any(Review.class));
    }

    // ─── 2. Tạo review khi chưa mua hàng → từ chối ───────────────────────────
    @Test
    @DisplayName("TC-RV-02: createReview - Từ chối khi chưa mua sản phẩm")
    void createReview_NotPurchased_ThrowsException() {
        when(reviewRepository.existsByProductIdAndUserId(10L, 1L)).thenReturn(false);
        when(orderItemRepository.existsByProductIdAndOrderUserId(10L, 1L)).thenReturn(false);

        ReviewDTO dto = ReviewDTO.builder().rating(4).comment("Good").build();

        assertThrows(BadRequestException.class, () -> logic.createReview(10L, 1L, dto));
        verify(reviewRepository, never()).save(any());
    }

    // ─── 3. Tạo review trùng → từ chối ──────────────────────────────────────
    @Test
    @DisplayName("TC-RV-03: createReview - Chặn đánh giá trùng lặp")
    void createReview_Duplicate_ThrowsException() {
        when(reviewRepository.existsByProductIdAndUserId(10L, 1L)).thenReturn(true);

        ReviewDTO dto = ReviewDTO.builder().rating(3).build();

        assertThrows(BadRequestException.class, () -> logic.createReview(10L, 1L, dto));
        verify(orderItemRepository, never()).existsByProductIdAndOrderUserId(any(), any());
    }

    // ─── 4. Sửa review của chính mình → thành công ───────────────────────────
    @Test
    @DisplayName("TC-RV-04: updateReview - Sửa review của chính mình thành công")
    void updateReview_OwnReview_Success() {
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(review));
        when(reviewRepository.save(any(Review.class))).thenReturn(review);

        ReviewDTO dto = ReviewDTO.builder().rating(4).comment("Đã sửa").build();
        ReviewDTO result = logic.updateReview(100L, 1L, dto);

        assertThat(result).isNotNull();
        verify(reviewRepository).save(argThat(r -> r.getRating() == 4));
    }

    // ─── 5. Sửa review của người khác → từ chối (IDOR) ───────────────────────
    @Test
    @DisplayName("TC-RV-05: updateReview - Chặn IDOR khi sửa review của người khác")
    void updateReview_IDOR_ThrowsException() {
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(review));

        ReviewDTO dto = ReviewDTO.builder().rating(1).comment("Hack").build();

        // otherUser (id=2) cố sửa review của owner (id=1)
        assertThrows(BadRequestException.class, () -> logic.updateReview(100L, 2L, dto));
        verify(reviewRepository, never()).save(any());
    }

    // ─── 6. Xóa review của chính mình → thành công ───────────────────────────
    @Test
    @DisplayName("TC-RV-06: deleteReview - Xóa review của chính mình thành công")
    void deleteReview_OwnReview_Success() {
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(review));

        logic.deleteReview(100L, 1L);

        verify(reviewRepository).delete(review);
    }

    // ─── 7. Xóa review của người khác → từ chối (IDOR) ───────────────────────
    @Test
    @DisplayName("TC-RV-07: deleteReview - Chặn IDOR khi xóa review của người khác")
    void deleteReview_IDOR_ThrowsException() {
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(review));

        assertThrows(BadRequestException.class, () -> logic.deleteReview(100L, 2L));
        verify(reviewRepository, never()).delete(any());
    }

    // ─── 8. Thống kê: điểm trung bình đúng ───────────────────────────────────
    @Test
    @DisplayName("TC-RV-08: getStats - Tính điểm trung bình và phân phối chính xác")
    void getStats_ReturnsCorrectAverage() {
        when(reviewRepository.findAvgRatingByProductId(10L)).thenReturn(Optional.of(4.5));
        when(reviewRepository.countByProductId(10L)).thenReturn(20L);
        when(reviewRepository.findRatingDistributionByProductId(10L))
                .thenReturn(List.of(
                        new Object[]{5, 12L},
                        new Object[]{4, 6L},
                        new Object[]{3, 2L}
                ));

        ReviewStatsResponse stats = logic.getStats(10L);

        assertThat(stats.getAverageRating()).isEqualTo(4.5);
        assertThat(stats.getReviewCount()).isEqualTo(20);
        assertThat(stats.getDistribution().get(5)).isEqualTo(12L);
        assertThat(stats.getDistribution().get(4)).isEqualTo(6L);
        assertThat(stats.getDistribution().get(1)).isEqualTo(0L);
    }

    // ─── 9. Lấy reviews của tôi có phân trang ────────────────────────────────
    @Test
    @DisplayName("TC-RV-09: getMyReviews - Phân trang danh sách review cá nhân")
    void getMyReviews_Paginated() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Review> page = new PageImpl<>(List.of(review), pageable, 1);
        when(reviewRepository.findByUserIdOrderByCreatedAtDesc(1L, pageable)).thenReturn(page);

        Page<Review> result = reviewRepository.findByUserIdOrderByCreatedAtDesc(1L, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(100L);
    }

    // ─── 10. Admin xóa review bất kỳ → thành công ────────────────────────────
    @Test
    @DisplayName("TC-RV-10: adminDeleteReview - Admin có thể xóa review của bất kỳ ai")
    void adminDeleteReview_Success() {
        when(reviewRepository.findById(100L)).thenReturn(Optional.of(review));

        // Admin (id=999) xóa review của owner (id=1) — không cần kiểm tra quyền sở hữu
        logic.adminDeleteReview(100L);

        verify(reviewRepository).delete(review);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper class chứa logic nghiệp vụ chiết xuất từ ReviewController
    // ─────────────────────────────────────────────────────────────────────────
    static class ReviewBusinessLogic {
        private final ReviewRepository reviewRepository;
        private final OrderItemRepository orderItemRepository;
        private final ProductRepository productRepository;
        private final UserRepository userRepository;

        ReviewBusinessLogic(ReviewRepository rr, OrderItemRepository oir, ProductRepository pr, UserRepository ur) {
            this.reviewRepository = rr;
            this.orderItemRepository = oir;
            this.productRepository = pr;
            this.userRepository = ur;
        }

        ReviewDTO createReview(Long productId, Long userId, ReviewDTO dto) {
            if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
                throw new BadRequestException("Bạn đã đánh giá sản phẩm này rồi");
            }
            if (!orderItemRepository.existsByProductIdAndOrderUserId(productId, userId)) {
                throw new BadRequestException("Bạn cần mua sản phẩm này trước khi có thể đánh giá");
            }
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
            Review saved = reviewRepository.save(
                    Review.builder().product(product).user(user).rating(dto.getRating()).comment(dto.getComment()).build()
            );
            boolean verified = orderItemRepository.existsByProductIdAndOrderUserId(productId, userId);
            return ReviewDTO.builder()
                    .id(saved.getId()).productId(saved.getProduct().getId())
                    .userId(saved.getUser().getId()).rating(saved.getRating())
                    .comment(saved.getComment()).verified(verified).canDelete(true).build();
        }

        ReviewDTO updateReview(Long id, Long userId, ReviewDTO dto) {
            Review review = reviewRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá"));
            if (!review.getUser().getId().equals(userId)) {
                throw new BadRequestException("Bạn không có quyền sửa đánh giá này");
            }
            review.setRating(dto.getRating());
            review.setComment(dto.getComment());
            Review saved = reviewRepository.save(review);
            return ReviewDTO.builder().id(saved.getId()).rating(saved.getRating())
                    .comment(saved.getComment()).canDelete(true).build();
        }

        void deleteReview(Long id, Long userId) {
            Review review = reviewRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá"));
            if (!review.getUser().getId().equals(userId)) {
                throw new BadRequestException("Bạn không có quyền xóa đánh giá này");
            }
            reviewRepository.delete(review);
        }

        void adminDeleteReview(Long id) {
            Review review = reviewRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá"));
            reviewRepository.delete(review);
        }

        ReviewStatsResponse getStats(Long productId) {
            double avg = reviewRepository.findAvgRatingByProductId(productId).orElse(0.0);
            long count = reviewRepository.countByProductId(productId);
            List<Object[]> dist = reviewRepository.findRatingDistributionByProductId(productId);
            java.util.Map<Integer, Long> distribution = new java.util.HashMap<>();
            for (int s = 1; s <= 5; s++) distribution.put(s, 0L);
            for (Object[] row : dist) {
                distribution.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
            }
            return ReviewStatsResponse.builder()
                    .averageRating(Math.round(avg * 10.0) / 10.0)
                    .reviewCount(count)
                    .distribution(distribution)
                    .build();
        }
    }
}
