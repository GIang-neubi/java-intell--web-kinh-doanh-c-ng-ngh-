package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.AddToCartRequest;
import dh13c7.baitaplon.dto.CartDTO;
import dh13c7.baitaplon.dto.UpdateCartItemRequest;

public interface CartService {
    CartDTO getCart(Long userId);
    CartDTO addItemToCart(Long userId, AddToCartRequest request);
    CartDTO updateCartItemQuantity(Long userId, Long itemId, UpdateCartItemRequest request);
    CartDTO deleteCartItem(Long userId, Long itemId);
    CartDTO clearCart(Long userId);
}
