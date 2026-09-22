package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.InventoryLog;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class InventoryLogResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productImage;
    private String type;
    private int quantity;
    private String note;
    private String createdBy;
    private Long warehouseId;
    private String warehouseCode;
    private String warehouseName;
    private LocalDateTime createdAt;

    public InventoryLogResponse(InventoryLog log) {
        this.id = log.getId();
        this.productId = log.getProduct().getId();
        this.productName = log.getProduct().getName();
        this.productImage = log.getProduct().getImage();
        this.type = log.getType();
        this.quantity = log.getQuantity();
        this.note = log.getNote();
        this.createdBy = log.getCreatedBy().getFullName() != null ? log.getCreatedBy().getFullName() : log.getCreatedBy().getUsername();
        if (log.getWarehouse() != null) {
            this.warehouseId = log.getWarehouse().getId();
            this.warehouseCode = log.getWarehouse().getWarehouseCode();
            this.warehouseName = log.getWarehouse().getName();
        }
        this.createdAt = log.getCreatedAt();
    }
}
