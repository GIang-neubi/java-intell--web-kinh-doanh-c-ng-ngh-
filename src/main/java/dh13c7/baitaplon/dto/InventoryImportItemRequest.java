package dh13c7.baitaplon.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InventoryImportItemRequest {
    @NotNull(message = "ID sản phẩm không được trống")
    private Long productId;

    @Min(value = 1, message = "Số lượng nhập phải lớn hơn 0")
    private int quantity;

    private String note;
}
