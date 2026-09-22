package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("SELECT p FROM Product p WHERE " +
           "(:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:categoryId IS NULL OR p.category.id = :categoryId) AND " +
           "(:brandId IS NULL OR p.brand.id = :brandId) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice)")
    Page<Product> searchProducts(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("brandId") Long brandId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable);

    long countByCategoryId(Long categoryId);
    long countByBrandId(Long brandId);

    @Query("SELECT p FROM Product p WHERE p.stock <= :threshold AND p.status = true ORDER BY p.stock ASC")
    List<Product> findLowStockProducts(@Param("threshold") int threshold, org.springframework.data.domain.Pageable pageable);

    @Modifying
    @Query(value = "DELETE FROM wishlist WHERE product_id = :productId", nativeQuery = true)
    void deleteWishlistLinks(@Param("productId") Long productId);
}
