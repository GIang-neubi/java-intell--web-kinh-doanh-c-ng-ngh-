package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.BrandDTO;
import dh13c7.baitaplon.service.BrandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BrandDTO>>> getAllBrands() {
        List<BrandDTO> brands = brandService.getAllBrands();
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách thương hiệu thành công", brands));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BrandDTO>> getBrandById(@PathVariable Long id) {
        BrandDTO brand = brandService.getBrandById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thương hiệu thành công", brand));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BrandDTO>> createBrand(@Valid @RequestBody BrandDTO brandDTO) {
        BrandDTO created = brandService.createBrand(brandDTO);
        return new ResponseEntity<>(new ApiResponse<>(true, "Tạo thương hiệu thành công", created), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BrandDTO>> updateBrand(@PathVariable Long id, @Valid @RequestBody BrandDTO brandDTO) {
        BrandDTO updated = brandService.updateBrand(id, brandDTO);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật thương hiệu thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Xóa thương hiệu thành công", null));
    }
}
