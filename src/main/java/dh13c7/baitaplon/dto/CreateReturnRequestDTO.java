package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.ReturnReason;
import lombok.Data;

import java.util.List;

@Data
public class CreateReturnRequestDTO {
    private Long orderId;
    private ReturnReason reason;
    private String description;
    private String proofImages;
    private List<CreateReturnItemDTO> items;
}
