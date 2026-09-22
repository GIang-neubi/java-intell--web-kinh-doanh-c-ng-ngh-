package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.ProductDeleteResult;
import dh13c7.baitaplon.dto.ProductRequest;
import dh13c7.baitaplon.dto.ProductResponse;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Brand;
import dh13c7.baitaplon.model.Category;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.repository.BrandRepository;
import dh13c7.baitaplon.repository.CartItemRepository;
import dh13c7.baitaplon.repository.CategoryRepository;
import dh13c7.baitaplon.repository.OrderItemRepository;
import dh13c7.baitaplon.repository.ProductImageRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.ReviewRepository;
import dh13c7.baitaplon.service.FileStorageService;
import dh13c7.baitaplon.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartItemRepository cartItemRepository;
    private final ReviewRepository reviewRepository;
    private final ProductImageRepository productImageRepository;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getAllProducts(String keyword, Long categoryId, Long brandId, BigDecimal minPrice, BigDecimal maxPrice, int pageNo, int pageSize, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Pageable pageable = PageRequest.of(pageNo, pageSize, sort);

        Page<Product> products = productRepository.searchProducts(keyword, categoryId, brandId, minPrice, maxPrice, pageable);

        List<ProductResponse> content = products.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageResponse<>(content, products.getNumber(), products.getSize(), products.getTotalElements(), products.getTotalPages(), products.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + id));
        return mapToResponse(product);
    }

    @Override
    @Transactional
    public ProductResponse createProduct(ProductRequest request, MultipartFile image) {
        validatePrices(request);

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thương hiệu"));

        Product product = new Product();
        applyRequest(product, request, category, brand);

        if (image != null && !image.isEmpty()) {
            product.setImage(fileStorageService.storeProductImage(image));
        }

        Product savedProduct = productRepository.save(product);
        return mapToResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request, MultipartFile image) {
        validatePrices(request);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + id));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thương hiệu"));

        String oldImage = product.getImage();
        applyRequest(product, request, category, brand);

        if (image != null && !image.isEmpty()) {
            String newImage = fileStorageService.storeProductImage(image);
            product.setImage(newImage);
            productRepository.save(product);
            if (oldImage != null && !oldImage.equals(newImage)) {
                fileStorageService.deleteIfExists(oldImage);
            }
            return mapToResponse(product);
        }

        Product updatedProduct = productRepository.save(product);
        return mapToResponse(updatedProduct);
    }

    @Override
    @Transactional
    public ProductDeleteResult deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + id));

        if (orderItemRepository.existsByProductId(id)) {
            product.setStatus(false);
            productRepository.save(product);
            return new ProductDeleteResult(true,
                    "Sản phẩm đã từng được bán nên được chuyển sang trạng thái ngừng bán (không xóa lịch sử đơn hàng).");
        }

        cartItemRepository.deleteByProductId(id);
        reviewRepository.deleteByProductId(id);
        productImageRepository.deleteByProductId(id);
        productRepository.deleteWishlistLinks(id);

        String image = product.getImage();
        productRepository.delete(product);
        fileStorageService.deleteIfExists(image);

        return new ProductDeleteResult(false, "Xóa sản phẩm thành công");
    }

    private void applyRequest(Product product, ProductRequest request, Category category, Brand brand) {
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setSpecifications(request.getSpecifications());
        product.setPrice(request.getPrice());
        product.setSalePrice(request.getSalePrice());
        product.setStock(request.getStock());
        product.setWeightKg(request.getWeightKg());
        product.setStatus(request.getStatus() == null || request.getStatus());
        product.setCategory(category);
        product.setBrand(brand);
    }

    private void validatePrices(ProductRequest request) {
        if (request.getSalePrice() != null && request.getPrice() != null
                && request.getSalePrice().compareTo(request.getPrice()) > 0) {
            throw new BadRequestException("Giá khuyến mãi không được lớn hơn giá gốc");
        }
    }

    private ProductResponse mapToResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getSpecifications(),
                product.getPrice(),
                product.getSalePrice(),
                product.getStock(),
                product.getWeightKg(),
                product.getImage(),
                product.getStatus(),
                product.getCategory() != null ? product.getCategory().getId() : null,
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getBrand() != null ? product.getBrand().getId() : null,
                product.getBrand() != null ? product.getBrand().getName() : null,
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
