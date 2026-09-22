package dh13c7.baitaplon.dto.delivery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodReconciliationResponse {
    private long totalDeliveredCodOrders;
    private BigDecimal totalCodCollected;
    private BigDecimal totalCodSettled;
    private BigDecimal totalCodPending;
    private List<ShipperCodSummaryDTO> shipperSummaries;
}
