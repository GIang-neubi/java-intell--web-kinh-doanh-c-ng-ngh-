package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    Optional<CartItem> findByCartIdAndProductId(Long cartId, Long productId);
    void deleteAllByCartId(Long cartId);
    void deleteByProductId(Long productId);
}
