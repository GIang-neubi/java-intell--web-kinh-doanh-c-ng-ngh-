package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.AddToCartRequest;
import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.CartDTO;
import dh13c7.baitaplon.dto.UpdateCartItemRequest;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        throw new BadCredentialsException("Vui lòng đăng nhập để thực hiện thao tác giỏ hàng.");
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CartDTO>> getCart() {
        CartDTO cart = cartService.getCart(getCurrentUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy giỏ hàng thành công", cart));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartDTO>> addItemToCart(@Valid @RequestBody AddToCartRequest request) {
        CartDTO cart = cartService.addItemToCart(getCurrentUserId(), request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Thêm sản phẩm vào giỏ hàng thành công", cart));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartDTO>> updateCartItemQuantity(@PathVariable Long itemId, @Valid @RequestBody UpdateCartItemRequest request) {
        CartDTO cart = cartService.updateCartItemQuantity(getCurrentUserId(), itemId, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật số lượng thành công", cart));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartDTO>> deleteCartItem(@PathVariable Long itemId) {
        CartDTO cart = cartService.deleteCartItem(getCurrentUserId(), itemId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Xóa sản phẩm khỏi giỏ hàng thành công", cart));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponse<CartDTO>> clearCart() {
        CartDTO cart = cartService.clearCart(getCurrentUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Xóa toàn bộ giỏ hàng thành công", cart));
    }
}
