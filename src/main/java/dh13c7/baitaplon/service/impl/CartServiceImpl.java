package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.AddToCartRequest;
import dh13c7.baitaplon.dto.CartDTO;
import dh13c7.baitaplon.dto.CartItemDTO;
import dh13c7.baitaplon.dto.UpdateCartItemRequest;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Cart;
import dh13c7.baitaplon.model.CartItem;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.CartItemRepository;
import dh13c7.baitaplon.repository.CartRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public CartDTO getCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        return mapToDTO(cart);
    }

    @Override
    @Transactional
    public CartDTO addItemToCart(Long userId, AddToCartRequest request) {
        Cart cart = getOrCreateCart(userId);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));

        if (!product.getStatus()) {
            throw new BadRequestException("Sản phẩm đã ngừng kinh doanh");
        }

        if (request.getQuantity() > product.getStock()) {
            throw new BadRequestException("Số lượng yêu cầu (" + request.getQuantity() + ") vượt quá số lượng tồn kho (" + product.getStock() + ")");
        }

        CartItem cartItem = cartItemRepository.findByCartIdAndProductId(cart.getId(), product.getId())
                .orElse(new CartItem(null, cart, product, 0));

        int newQuantity = cartItem.getQuantity() + request.getQuantity();

        if (newQuantity > product.getStock()) {
            throw new BadRequestException("Tổng số lượng trong giỏ (" + newQuantity + ") vượt quá số lượng tồn kho (" + product.getStock() + ")");
        }

        cartItem.setQuantity(newQuantity);
        cartItemRepository.save(cartItem);

        // Refresh cart to get updated items
        cart = cartRepository.findById(cart.getId()).orElseThrow();
        return mapToDTO(cart);
    }

    @Override
    @Transactional
    public CartDTO updateCartItemQuantity(Long userId, Long itemId, UpdateCartItemRequest request) {
        Cart cart = getOrCreateCart(userId);
        CartItem cartItem = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng"));

        if (!cartItem.getCart().getId().equals(cart.getId())) {
            throw new BadRequestException("Sản phẩm không thuộc giỏ hàng của bạn");
        }

        Product product = cartItem.getProduct();
        if (request.getQuantity() > product.getStock()) {
            throw new BadRequestException("Số lượng yêu cầu (" + request.getQuantity() + ") vượt quá số lượng tồn kho (" + product.getStock() + ")");
        }

        cartItem.setQuantity(request.getQuantity());
        cartItemRepository.save(cartItem);

        cart = cartRepository.findById(cart.getId()).orElseThrow();
        return mapToDTO(cart);
    }

    @Override
    @Transactional
    public CartDTO deleteCartItem(Long userId, Long itemId) {
        Cart cart = getOrCreateCart(userId);
        CartItem cartItem = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng"));

        if (!cartItem.getCart().getId().equals(cart.getId())) {
            throw new BadRequestException("Sản phẩm không thuộc giỏ hàng của bạn");
        }

        cartItemRepository.delete(cartItem);

        // Force hibernate to flush and clear before fetching again
        cartItemRepository.flush();
        cart = cartRepository.findById(cart.getId()).orElseThrow();
        
        // Remove item from in-memory list to return correct DTO immediately
        cart.getItems().removeIf(item -> item.getId().equals(itemId));
        return mapToDTO(cart);
    }

    @Override
    @Transactional
    public CartDTO clearCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        cartItemRepository.deleteAllByCartId(cart.getId());
        cart.getItems().clear();
        return mapToDTO(cart);
    }

    private Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            Cart newCart = new Cart();
            newCart.setUser(user);
            return cartRepository.save(newCart);
        });
    }

    private CartDTO mapToDTO(Cart cart) {
        List<CartItemDTO> itemDTOs = cart.getItems().stream().map(item -> {
            BigDecimal price = item.getProduct().getPrice();
            BigDecimal subTotal = price.multiply(BigDecimal.valueOf(item.getQuantity()));
            return new CartItemDTO(
                    item.getId(),
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getProduct().getImage(),
                    price,
                    item.getQuantity(),
                    subTotal
            );
        }).collect(Collectors.toList());

        BigDecimal totalPrice = itemDTOs.stream()
                .map(CartItemDTO::getSubTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartDTO(cart.getId(), cart.getUser().getId(), itemDTOs, totalPrice);
    }
}
