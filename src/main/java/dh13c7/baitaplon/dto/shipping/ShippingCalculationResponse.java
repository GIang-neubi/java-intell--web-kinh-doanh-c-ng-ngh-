package dh13c7.baitaplon.dto.shipping;

import dh13c7.baitaplon.model.ShippingMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingCalculationResponse {
    private ShippingMethod shippingMethod;
    private String displayName;
    private BigDecimal shippingFee;
    private BigDecimal baseFee;
    private BigDecimal distanceFee;
    private BigDecimal weightFee;
    private BigDecimal minimumFee;
    private String estimatedDelivery;
    private String description;
    private boolean freeShippingApplied;
    private BigDecimal totalWeightKg;
    private Double distanceKm;
}
