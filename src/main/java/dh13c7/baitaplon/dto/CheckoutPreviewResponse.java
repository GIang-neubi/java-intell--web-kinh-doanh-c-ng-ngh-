package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.ShippingMethod;
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
public class CheckoutPreviewResponse {
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private ShippingMethod shippingMethod;
    private String shippingMethodName;
    private String estimatedDelivery;
    private BigDecimal totalWeightKg;
    private Double distanceKm;
    private Long warehouseId;
    private String warehouseCode;
    private String warehouseName;
    private Boolean voucherValid;
    private String voucherMessage;
    private List<CheckoutItemPreviewDTO> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CheckoutItemPreviewDTO {
        private Long productId;
        private String productName;
        private String image;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal lineTotal;
        private BigDecimal weightKg;
        private Integer availableStock;
        private Boolean inStock;
    }
}
