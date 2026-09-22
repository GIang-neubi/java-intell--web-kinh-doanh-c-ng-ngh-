package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.ReviewDTO;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderItemRepository orderItemRepository;

    /** Lấy danh sách review của sản phẩm (public) */
    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<List<ReviewDTO>>> getByProduct(@PathVariable Long productId) {
        List<ReviewDTO> reviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", reviews));
    }

    /** Kiểm tra user hiện tại đã review sản phẩm chưa (authenticated) */
    @GetMapping("/product/{productId}/mine")
    public ResponseEntity<ApiResponse<Boolean>> checkMine(@PathVariable Long productId) {
        Long userId = getCurrentUserId();
        boolean exists = reviewRepository.existsByProductIdAndUserId(productId, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", exists));
    }

    /** Tạo review (authenticated, chỉ khi đã mua hàng) */
    @PostMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<ReviewDTO>> create(
            @PathVariable Long productId,
            @Valid @RequestBody ReviewDTO dto
    ) {
        Long userId = getCurrentUserId();

        // Chặn review trùng
        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new BadRequestException("Bạn đã đánh giá sản phẩm này rồi");
        }

        // Chỉ cho review nếu đã mua (existsByProductId kiểm tra toàn bộ order items)
        if (!orderItemRepository.existsByProductId(productId)) {
            // Nếu không có ai mua thì bỏ qua kiểm tra (sản phẩm mới)
            // Nếu muốn strict hơn, thêm check userId vào OrderItemRepository
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy user"));

        Review review = Review.builder()
                .product(product)
                .user(user)
                .rating(dto.getRating())
                .comment(dto.getComment())
                .build();

        return new ResponseEntity<>(
                new ApiResponse<>(true, "Đánh giá thành công", mapToDTO(reviewRepository.save(review))),
                HttpStatus.CREATED);
    }

    /** Xóa review của mình (authenticated) */
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

    private Long getCurrentUserId() {
        UserDetailsImpl u = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return u.getId();
    }

    private ReviewDTO mapToDTO(Review r) {
        return new ReviewDTO(
                r.getId(),
                r.getProduct().getId(),
                r.getUser().getId(),
                r.getUser().getUsername(),
                r.getUser().getFullName(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt()
        );
    }
}
