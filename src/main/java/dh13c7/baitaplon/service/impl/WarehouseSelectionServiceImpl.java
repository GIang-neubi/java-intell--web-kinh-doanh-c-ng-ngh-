package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.model.Warehouse;
import dh13c7.baitaplon.repository.WarehouseRepository;
import dh13c7.baitaplon.service.DistanceService;
import dh13c7.baitaplon.service.WarehouseSelectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class WarehouseSelectionServiceImpl implements WarehouseSelectionService {

    private final WarehouseRepository warehouseRepository;
    private final DistanceService distanceService;

    @Override
    public SelectionResult selectWarehouseForOrder(Double customerLat, Double customerLng) {
        List<Warehouse> activeWarehouses = warehouseRepository.findByStatusOrderByNameAsc("ACTIVE");
        if (activeWarehouses.isEmpty()) {
            activeWarehouses = warehouseRepository.findAll();
        }

        if (activeWarehouses.isEmpty()) {
            log.warn("Không tìm thấy bất kỳ kho hàng nào trong hệ thống");
            return new SelectionResult(null, null);
        }

        // Nếu có toạ độ khách hàng, tìm kho gần nhất có toạ độ hợp lệ
        if (customerLat != null && customerLng != null) {
            Warehouse nearestWarehouse = null;
            Double minDistance = null;

            for (Warehouse wh : activeWarehouses) {
                if (wh.getLatitude() != null && wh.getLongitude() != null) {
                    Double dist = distanceService.calculateDistanceKm(
                            wh.getLatitude(), wh.getLongitude(),
                            customerLat, customerLng
                    );
                    if (dist != null) {
                        if (minDistance == null || dist < minDistance) {
                            minDistance = dist;
                            nearestWarehouse = wh;
                        }
                    }
                }
            }

            if (nearestWarehouse != null) {
                log.info("Đã chọn kho gần nhất: {} ({} km) cho khách hàng tại ({}, {})",
                        nearestWarehouse.getWarehouseCode(), minDistance, customerLat, customerLng);
                return new SelectionResult(nearestWarehouse, minDistance);
            }
        }

        // Fallback xác định: chọn kho đầu tiên sắp xếp theo mã kho tăng dần
        Warehouse fallback = activeWarehouses.stream()
                .min(Comparator.comparing(wh -> wh.getWarehouseCode() != null ? wh.getWarehouseCode() : ""))
                .orElse(activeWarehouses.get(0));

        log.info("Chọn kho fallback xác định: {}", fallback.getWarehouseCode());
        return new SelectionResult(fallback, null);
    }
}
