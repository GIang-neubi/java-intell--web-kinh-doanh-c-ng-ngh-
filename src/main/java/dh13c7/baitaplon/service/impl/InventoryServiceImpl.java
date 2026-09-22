package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.InventoryImportRequest;
import dh13c7.baitaplon.dto.InventoryLogResponse;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.model.InventoryLog;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.model.Warehouse;
import dh13c7.baitaplon.repository.InventoryLogRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.repository.WarehouseRepository;
import dh13c7.baitaplon.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryLogRepository inventoryLogRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;

    @Override
    @Transactional
    public void importInventory(InventoryImportRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));

        Warehouse warehouse = null;
        if (request.getWarehouseId() != null) {
            warehouse = warehouseRepository.findById(request.getWarehouseId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy kho hàng ID: " + request.getWarehouseId()));
        }

        for (var item : request.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy sản phẩm ID: " + item.getProductId()));
            
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);

            InventoryLog log = InventoryLog.builder()
                    .product(product)
                    .warehouse(warehouse)
                    .type("IMPORT")
                    .quantity(item.getQuantity())
                    .note(item.getNote() != null && !item.getNote().isEmpty() ? item.getNote() : request.getGeneralNote())
                    .createdBy(user)
                    .build();
            inventoryLogRepository.save(log);
        }
    }

    @Override
    public Page<InventoryLogResponse> getLogs(Pageable pageable) {
        return inventoryLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(InventoryLogResponse::new);
    }
}
