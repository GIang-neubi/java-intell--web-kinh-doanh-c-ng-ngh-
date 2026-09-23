package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
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
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderItemRepository orderItemRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC: Lấy danh sách đánh giá của sản phẩm (có phân trang + lọc sao)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<PageResponse<ReviewDTO>>> getByProduct(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer rating,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        Sort sortObj = "oldest".equals(sort)
                ? Sort.by("createdAt").ascending()
                : Sort.by("createdAt").descending();
        Pageable pageable = PageRequest.of(page, size, sortObj);

        Page<Review> reviewPage = (rating != null && rating >= 1 && rating <= 5)
                ? reviewRepository.findByProductIdAndRatingOrderByCreatedAtDesc(productId, rating, pageable)
                : reviewRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable);

        Long currentUserId = getCurrentUserIdOrNull();
        Page<ReviewDTO> dtoPage = reviewPage.map(r -> mapToDTO(r, currentUserId, productId));
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", new PageResponse<>(dtoPage)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC: Thống kê đánh giá của sản phẩm (avg, count, distribution)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/product/{productId}/stats")
    public ResponseEntity<ApiResponse<ReviewStatsResponse>> getStats(@PathVariable Long productId) {
        double avg = reviewRepository.findAvgRatingByProductId(productId).orElse(0.0);
        long count = reviewRepository.countByProductId(productId);
        List<Object[]> dist = reviewRepository.findRatingDistributionByProductId(productId);

        Map<Integer, Long> distribution = new HashMap<>();
        for (int s = 1; s <= 5; s++) distribution.put(s, 0L);
        for (Object[] row : dist) {
            distribution.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }

        double rounded = Math.round(avg * 10.0) / 10.0;
        return ResponseEntity.ok(new ApiResponse<>(true, "OK",
                ReviewStatsResponse.builder()
                        .averageRating(rounded)
                        .reviewCount(count)
                        .distribution(distribution)
                        .build()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC: Kiểm tra user hiện tại đã review sản phẩm chưa
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/product/{productId}/mine")
    public ResponseEntity<ApiResponse<Boolean>> checkMine(@PathVariable Long productId) {
        Long userId = getCurrentUserId();
        boolean exists = reviewRepository.existsByProductIdAndUserId(productId, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", exists));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATED: Kiểm tra user đã mua sản phẩm chưa (verified purchase)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/product/{productId}/can-review")
    public ResponseEntity<ApiResponse<Boolean>> canReview(@PathVariable Long productId) {
        Long userId = getCurrentUserId();
        boolean purchased = orderItemRepository.existsByProductIdAndOrderUserId(productId, userId);
        boolean alreadyReviewed = reviewRepository.existsByProductIdAndUserId(productId, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", purchased && !alreadyReviewed));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATED: Lấy tất cả reviews của user đang đăng nhập
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<ReviewDTO>>> getMyReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Long userId = getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Review> reviewPage = reviewRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        Page<ReviewDTO> dtoPage = reviewPage.map(r -> mapToDTO(r, userId, r.getProduct().getId()));
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", new PageResponse<>(dtoPage)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATED: Tạo đánh giá mới (bắt buộc đã mua hàng)
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<ReviewDTO>> create(
            @PathVariable Long productId,
            @Valid @RequestBody ReviewDTO dto
    ) {
        Long userId = getCurrentUserId();

        // 1. Chặn review trùng
        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new BadRequestException("Bạn đã đánh giá sản phẩm này rồi");
        }

        // 2. Kiểm tra đã mua hàng (Verified Purchase)
        boolean purchased = orderItemRepository.existsByProductIdAndOrderUserId(productId, userId);
        if (!purchased) {
            throw new BadRequestException("Bạn cần mua sản phẩm này trước khi có thể đánh giá");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Review review = Review.builder()
                .product(product)
                .user(user)
                .rating(dto.getRating())
                .comment(dto.getComment())
                .build();

        ReviewDTO result = mapToDTO(reviewRepository.save(review), userId, productId);
        return new ResponseEntity<>(new ApiResponse<>(true, "Đánh giá thành công", result), HttpStatus.CREATED);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATED: Sửa đánh giá của chính mình
    // ─────────────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReviewDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody ReviewDTO dto
    ) {
        Long userId = getCurrentUserId();
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá"));

        if (!review.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền sửa đánh giá này");
        }

        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
        ReviewDTO result = mapToDTO(reviewRepository.save(review), userId, review.getProduct().getId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật đánh giá thành công", result));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATED: Xóa đánh giá của chính mình
    // ─────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá"));
        if (!review.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền xóa đánh giá này");
        }
        reviewRepository.delete(review);
        return ResponseEntity.ok(new ApiResponse<>(true, "Đã xóa đánh giá", null));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Xóa bất kỳ đánh giá nào
    // ─────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> adminDelete(@PathVariable Long id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá"));
        reviewRepository.delete(review);
        return ResponseEntity.ok(new ApiResponse<>(true, "Admin đã xóa đánh giá", null));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private Long getCurrentUserId() {
        UserDetailsImpl u = (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return u.getId();
    }

    private Long getCurrentUserIdOrNull() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetailsImpl u) {
                return u.getId();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private ReviewDTO mapToDTO(Review r, Long currentUserId, Long productId) {
        boolean purchased = currentUserId != null
                && orderItemRepository.existsByProductIdAndOrderUserId(productId, currentUserId);
        boolean canDelete = currentUserId != null && r.getUser().getId().equals(currentUserId);

        return ReviewDTO.builder()
                .id(r.getId())
                .productId(r.getProduct().getId())
                .productName(r.getProduct().getName())
                .productImage(r.getProduct().getImage())
                .userId(r.getUser().getId())
                .username(r.getUser().getUsername())
                .fullName(r.getUser().getFullName())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .verified(purchased)
                .canDelete(canDelete)
                .build();
    }
}
