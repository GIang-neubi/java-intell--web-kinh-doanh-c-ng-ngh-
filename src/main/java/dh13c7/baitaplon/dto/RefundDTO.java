package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.RefundStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class RefundDTO {
    private Long id;
    private Long returnRequestId;
    private Long orderId;
    private String orderCode;
    private String customerName;
    private BigDecimal amount;
    private RefundStatus status;
    private String paymentMethod;
    private String transactionReference;
    private LocalDateTime processedAt;
    private String adminNote;
    private LocalDateTime createdAt;
}
