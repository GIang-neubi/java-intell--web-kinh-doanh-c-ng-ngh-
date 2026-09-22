package dh13c7.baitaplon.dto.warehouse;

import dh13c7.baitaplon.model.Warehouse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseDetailResponse {
    private Long id;
    private String warehouseCode;
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private String phone;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public WarehouseDetailResponse(Warehouse warehouse) {
        if (warehouse != null) {
            this.id = warehouse.getId();
            this.warehouseCode = warehouse.getWarehouseCode();
            this.name = warehouse.getName();
            this.address = warehouse.getAddress();
            this.latitude = warehouse.getLatitude();
            this.longitude = warehouse.getLongitude();
            this.phone = warehouse.getPhone();
            this.status = warehouse.getStatus();
            this.createdAt = warehouse.getCreatedAt();
            this.updatedAt = warehouse.getUpdatedAt();
        }
    }
}
