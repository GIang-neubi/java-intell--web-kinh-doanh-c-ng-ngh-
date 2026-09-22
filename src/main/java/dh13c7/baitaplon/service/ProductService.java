package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.ProductDeleteResult;
import dh13c7.baitaplon.dto.ProductRequest;
import dh13c7.baitaplon.dto.ProductResponse;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

public interface ProductService {
    PageResponse<ProductResponse> getAllProducts(String keyword, Long categoryId, Long brandId, BigDecimal minPrice, BigDecimal maxPrice, int pageNo, int pageSize, String sortBy, String sortDir);
    ProductResponse getProductById(Long id);
    ProductResponse createProduct(ProductRequest productRequest, MultipartFile image);
    ProductResponse updateProduct(Long id, ProductRequest productRequest, MultipartFile image);
    ProductDeleteResult deleteProduct(Long id);
}
