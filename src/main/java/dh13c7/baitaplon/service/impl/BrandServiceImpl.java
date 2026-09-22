package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.BrandDTO;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Brand;
import dh13c7.baitaplon.repository.BrandRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.service.BrandService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BrandServiceImpl implements BrandService {

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;

    @Override
    public List<BrandDTO> getAllBrands() {
        return brandRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public BrandDTO getBrandById(Long id) {
        return mapToDTO(findOrThrow(id));
    }

    @Override
    public BrandDTO createBrand(BrandDTO dto) {
        if (brandRepository.existsByNameIgnoreCase(dto.getName().trim())) {
            throw new BadRequestException("Thương hiệu \"" + dto.getName().trim() + "\" đã tồn tại");
        }
        Brand brand = new Brand();
        applyDTO(brand, dto);
        return mapToDTO(brandRepository.save(brand));
    }

    @Override
    public BrandDTO updateBrand(Long id, BrandDTO dto) {
        Brand brand = findOrThrow(id);
        if (brandRepository.existsByNameIgnoreCaseAndIdNot(dto.getName().trim(), id)) {
            throw new BadRequestException("Thương hiệu \"" + dto.getName().trim() + "\" đã tồn tại");
        }
        applyDTO(brand, dto);
        return mapToDTO(brandRepository.save(brand));
    }

    @Override
    public void deleteBrand(Long id) {
        Brand brand = findOrThrow(id);
        long productCount = productRepository.countByBrandId(id);
        if (productCount > 0) {
            throw new BadRequestException(
                "Không thể xóa thương hiệu \"" + brand.getName() + "\" vì đang có "
                + productCount + " sản phẩm thuộc thương hiệu này.");
        }
        brandRepository.delete(brand);
    }

    private Brand findOrThrow(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thương hiệu với id: " + id));
    }

    private void applyDTO(Brand brand, BrandDTO dto) {
        brand.setName(dto.getName().trim());
        brand.setDescription(dto.getDescription());
        brand.setLogo(dto.getLogo());
    }

    private BrandDTO mapToDTO(Brand brand) {
        long count = productRepository.countByBrandId(brand.getId());
        return new BrandDTO(brand.getId(), brand.getName(), brand.getDescription(), brand.getLogo(), count);
    }
}
