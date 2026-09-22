package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.warehouse.WarehouseDetailResponse;
import dh13c7.baitaplon.dto.warehouse.WarehouseRequest;
import dh13c7.baitaplon.dto.warehouse.WarehouseResponse;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Warehouse;
import dh13c7.baitaplon.repository.WarehouseRepository;
import dh13c7.baitaplon.service.WarehouseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<WarehouseResponse> getAllWarehouses(Pageable pageable) {
        return warehouseRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(WarehouseResponse::new);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WarehouseResponse> getActiveWarehouses() {
        return warehouseRepository.findByStatusOrderByNameAsc("ACTIVE")
                .stream()
                .map(WarehouseResponse::new)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public WarehouseDetailResponse getWarehouseById(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kho hàng với ID: " + id));
        return new WarehouseDetailResponse(warehouse);
    }

    @Override
    @Transactional
    public WarehouseResponse createWarehouse(WarehouseRequest request) {
        String code = request.getWarehouseCode().trim().toUpperCase();
        if (warehouseRepository.existsByWarehouseCode(code)) {
            throw new BadRequestException("Mã kho đã tồn tại: " + code);
        }

        String status = request.getStatus() != null && !request.getStatus().isBlank() 
                ? request.getStatus().trim().toUpperCase() 
                : "ACTIVE";

        Warehouse warehouse = Warehouse.builder()
                .warehouseCode(code)
                .name(request.getName().trim())
                .address(request.getAddress().trim())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .status(status)
                .build();

        Warehouse saved = warehouseRepository.save(warehouse);
        log.info("Đã tạo kho mới: {} - {}", saved.getWarehouseCode(), saved.getName());
        return new WarehouseResponse(saved);
    }

    @Override
    @Transactional
    public WarehouseResponse updateWarehouse(Long id, WarehouseRequest request) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kho hàng với ID: " + id));

        String newCode = request.getWarehouseCode().trim().toUpperCase();
        if (!warehouse.getWarehouseCode().equalsIgnoreCase(newCode) && warehouseRepository.existsByWarehouseCode(newCode)) {
            throw new BadRequestException("Mã kho đã tồn tại: " + newCode);
        }

        warehouse.setWarehouseCode(newCode);
        warehouse.setName(request.getName().trim());
        warehouse.setAddress(request.getAddress().trim());
        warehouse.setLatitude(request.getLatitude());
        warehouse.setLongitude(request.getLongitude());
        warehouse.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            warehouse.setStatus(request.getStatus().trim().toUpperCase());
        }

        Warehouse updated = warehouseRepository.save(warehouse);
        log.info("Đã cập nhật kho: {} - {}", updated.getWarehouseCode(), updated.getName());
        return new WarehouseResponse(updated);
    }

    @Override
    @Transactional
    public WarehouseResponse updateWarehouseStatus(Long id, String status) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kho hàng với ID: " + id));

        String normalizedStatus = status.trim().toUpperCase();
        if (!"ACTIVE".equals(normalizedStatus) && !"INACTIVE".equals(normalizedStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE hoặc INACTIVE");
        }

        warehouse.setStatus(normalizedStatus);
        Warehouse updated = warehouseRepository.save(warehouse);
        log.info("Cập nhật trạng thái kho {} thành {}", id, normalizedStatus);
        return new WarehouseResponse(updated);
    }

    @Override
    @Transactional
    public void deleteWarehouse(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kho hàng với ID: " + id));
        
        warehouseRepository.delete(warehouse);
        log.info("Đã xóa kho hàng ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public Warehouse getDefaultOrFirstActiveWarehouse() {
        List<Warehouse> activeWarehouses = warehouseRepository.findByStatusOrderByNameAsc("ACTIVE");
        if (!activeWarehouses.isEmpty()) {
            return activeWarehouses.get(0);
        }
        return warehouseRepository.findAll().stream().findFirst().orElse(null);
    }
}
