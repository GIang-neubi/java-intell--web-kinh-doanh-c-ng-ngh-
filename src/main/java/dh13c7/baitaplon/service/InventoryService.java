package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.InventoryImportRequest;
import dh13c7.baitaplon.dto.InventoryLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InventoryService {
    void importInventory(InventoryImportRequest request, Long userId);
    Page<InventoryLogResponse> getLogs(Pageable pageable);
}
