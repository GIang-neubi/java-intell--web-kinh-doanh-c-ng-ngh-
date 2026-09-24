package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.ReturnCondition;
import lombok.Data;

@Data
public class CreateReturnItemDTO {
    private Long orderItemId;
    private Integer quantity;
    private ReturnCondition condition;
    private String note;
}
