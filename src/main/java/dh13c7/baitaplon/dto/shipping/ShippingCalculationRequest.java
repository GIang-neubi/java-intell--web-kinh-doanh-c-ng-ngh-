package dh13c7.baitaplon.dto.shipping;

import dh13c7.baitaplon.model.ShippingMethod;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingCalculationRequest {

    @NotNull(message = "Phương thức vận chuyển không được để trống")
    private ShippingMethod shippingMethod;

    private BigDecimal orderAmount;

    private BigDecimal totalWeightKg;

    private Double distanceKm;

    private Long warehouseId;

    private Double customerLatitude;

    private Double customerLongitude;

    private String destinationAddress;
}
