package dh13c7.baitaplon.service;

import dh13c7.baitaplon.model.Warehouse;

public interface WarehouseSelectionService {

    record SelectionResult(Warehouse warehouse, Double distanceKm) {}

    /**
     * Lựa chọn kho hàng xác định (deterministic) cho đơn hàng:
     * 1. Kho có trạng thái ACTIVE
     * 2. Nếu có toạ độ khách hàng, chọn kho gần nhất theo khoảng cách Haversine
     * 3. Fallback theo thứ tự mã kho (warehouseCode ASC)
     */
    SelectionResult selectWarehouseForOrder(Double customerLat, Double customerLng);
}
