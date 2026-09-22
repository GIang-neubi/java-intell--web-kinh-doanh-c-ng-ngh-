package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.CategoryDTO;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Category;
import dh13c7.baitaplon.repository.CategoryRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Override
    public List<CategoryDTO> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public CategoryDTO getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với id: " + id));
        return mapToDTO(category);
    }

    @Override
    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        if (categoryRepository.existsByNameIgnoreCase(categoryDTO.getName().trim())) {
            throw new BadRequestException("Danh mục \"" + categoryDTO.getName().trim() + "\" đã tồn tại");
        }
        Category category = new Category();
        category.setName(categoryDTO.getName().trim());
        category.setDescription(categoryDTO.getDescription());
        return mapToDTO(categoryRepository.save(category));
    }

    @Override
    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với id: " + id));
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(categoryDTO.getName().trim(), id)) {
            throw new BadRequestException("Danh mục \"" + categoryDTO.getName().trim() + "\" đã tồn tại");
        }
        category.setName(categoryDTO.getName().trim());
        category.setDescription(categoryDTO.getDescription());
        return mapToDTO(categoryRepository.save(category));
    }

    @Override
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với id: " + id));
        long productCount = productRepository.countByCategoryId(id);
        if (productCount > 0) {
            throw new BadRequestException(
                    "Không thể xóa danh mục \"" + category.getName() + "\" vì đang có "
                    + productCount + " sản phẩm thuộc danh mục này. Vui lòng chuyển hoặc xóa các sản phẩm trước."
            );
        }
        categoryRepository.delete(category);
    }

    private CategoryDTO mapToDTO(Category category) {
        long count = productRepository.countByCategoryId(category.getId());
        return new CategoryDTO(category.getId(), category.getName(), category.getDescription(), count);
    }
}
