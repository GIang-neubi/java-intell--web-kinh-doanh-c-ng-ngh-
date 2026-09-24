package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.ReturnCondition;
import dh13c7.baitaplon.model.ReturnReason;
import dh13c7.baitaplon.model.ReturnStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ReturnRequestDTO {
    private Long id;
    private Long orderId;
    private String orderCode;
    private Long customerId;
    private String customerName;
    private ReturnReason reason;
    private String description;
    private ReturnStatus status;
    private String proofImages;
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime receivedAt;
    private LocalDateTime rejectedAt;
    private String adminNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ReturnItemDTO> items;
}
