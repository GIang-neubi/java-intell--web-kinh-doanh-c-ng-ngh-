package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.ReturnCondition;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReturnItemDTO {
    private Long id;
    private Long orderItemId;
    private Long productId;
    private String productName;
    private Integer quantity;
    private ReturnCondition condition;
    private String note;
}
