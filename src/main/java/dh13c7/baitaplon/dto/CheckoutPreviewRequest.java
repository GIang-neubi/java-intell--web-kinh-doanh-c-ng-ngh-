package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.ShippingMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutPreviewRequest {
    private ShippingMethod shippingMethod;
    private String voucherCode;
    private String shippingAddress;
    private Double customerLatitude;
    private Double customerLongitude;
}
