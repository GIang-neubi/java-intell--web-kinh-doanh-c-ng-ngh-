package dh13c7.baitaplon.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class InventoryImportRequest {
    @NotEmpty(message = "Danh sách sản phẩm nhập không được rỗng")
    @Valid
    private List<InventoryImportItemRequest> items;

    private Long warehouseId;

    private String generalNote;
}
