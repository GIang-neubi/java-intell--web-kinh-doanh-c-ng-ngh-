package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.warehouse.WarehouseDetailResponse;
import dh13c7.baitaplon.dto.warehouse.WarehouseRequest;
import dh13c7.baitaplon.dto.warehouse.WarehouseResponse;
import dh13c7.baitaplon.model.Warehouse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface WarehouseService {

    Page<WarehouseResponse> getAllWarehouses(Pageable pageable);

    List<WarehouseResponse> getActiveWarehouses();

    WarehouseDetailResponse getWarehouseById(Long id);

    WarehouseResponse createWarehouse(WarehouseRequest request);

    WarehouseResponse updateWarehouse(Long id, WarehouseRequest request);

    WarehouseResponse updateWarehouseStatus(Long id, String status);

    void deleteWarehouse(Long id);

    Warehouse getDefaultOrFirstActiveWarehouse();
}
