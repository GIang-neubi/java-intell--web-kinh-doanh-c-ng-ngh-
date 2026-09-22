package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.ProductResponse;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    /** Lấy danh sách yêu thích của user */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Long>>> getWishlist() {
        User user = getUser();
        List<Long> ids = user.getWishlistedProducts().stream()
                .map(Product::getId).collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", ids));
    }

    /** Toggle: thêm vào hoặc xóa khỏi wishlist */
    @PostMapping("/{productId}/toggle")
    public ResponseEntity<ApiResponse<Boolean>> toggle(@PathVariable Long productId) {
        User user = getUser();
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));

        boolean isInWishlist = user.getWishlistedProducts().stream()
                .anyMatch(p -> p.getId().equals(productId));

        if (isInWishlist) {
            user.getWishlistedProducts().removeIf(p -> p.getId().equals(productId));
        } else {
            user.getWishlistedProducts().add(product);
        }
        userRepository.save(user);
        return ResponseEntity.ok(new ApiResponse<>(true,
                isInWishlist ? "Đã xóa khỏi yêu thích" : "Đã thêm vào yêu thích", !isInWishlist));
    }

    private User getUser() {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl)) {
            throw new BadCredentialsException("Vui lòng đăng nhập để sử dụng tính năng yêu thích.");
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy user"));
    }
}
