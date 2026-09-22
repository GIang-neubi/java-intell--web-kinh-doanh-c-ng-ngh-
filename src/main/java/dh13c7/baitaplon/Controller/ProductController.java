package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.ProductDeleteResult;
import dh13c7.baitaplon.dto.ProductRequest;
import dh13c7.baitaplon.dto.ProductResponse;
import dh13c7.baitaplon.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> getAllProducts(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "brandId", required = false) Long brandId,
            @RequestParam(value = "minPrice", required = false) BigDecimal minPrice,
            @RequestParam(value = "maxPrice", required = false) BigDecimal maxPrice,
            @RequestParam(value = "pageNo", defaultValue = "0", required = false) int pageNo,
            @RequestParam(value = "pageSize", defaultValue = "10", required = false) int pageSize,
            @RequestParam(value = "sortBy", defaultValue = "id", required = false) String sortBy,
            @RequestParam(value = "sortDir", defaultValue = "desc", required = false) String sortDir
    ) {
        PageResponse<ProductResponse> products = productService.getAllProducts(
                keyword, categoryId, brandId, minPrice, maxPrice, pageNo, pageSize, sortBy, sortDir);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách sản phẩm thành công", products));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        ProductResponse product = productService.getProductById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết sản phẩm thành công", product));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestPart("data") ProductRequest productRequest,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        ProductResponse created = productService.createProduct(productRequest, image);
        return new ResponseEntity<>(new ApiResponse<>(true, "Tạo sản phẩm thành công", created), HttpStatus.CREATED);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestPart("data") ProductRequest productRequest,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        ProductResponse updated = productService.updateProduct(id, productRequest, image);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật sản phẩm thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductDeleteResult>> deleteProduct(@PathVariable Long id) {
        ProductDeleteResult result = productService.deleteProduct(id);
        return ResponseEntity.ok(new ApiResponse<>(true, result.getMessage(), result));
    }
}
