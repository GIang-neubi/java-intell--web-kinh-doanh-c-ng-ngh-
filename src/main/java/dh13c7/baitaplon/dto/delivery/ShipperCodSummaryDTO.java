package dh13c7.baitaplon.dto.delivery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShipperCodSummaryDTO {
    private Long shipperId;
    private String shipperName;
    private String shipperPhone;
    private long totalCodOrders;
    private BigDecimal totalCodCollected;
    private BigDecimal totalCodSettled;
    private BigDecimal pendingCodAmount;
    private long pendingCodOrders;
    private long settledCodOrders;
}
