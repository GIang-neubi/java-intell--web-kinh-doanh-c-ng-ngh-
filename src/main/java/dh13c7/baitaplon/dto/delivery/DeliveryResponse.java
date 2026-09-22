package dh13c7.baitaplon.dto.delivery;

import dh13c7.baitaplon.model.DeliveryStatus;
import dh13c7.baitaplon.model.ShippingMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryResponse {
    private Long id;
    private Long orderId;
    private String orderCode;
    private Long customerId;
    private String customerName;
    private String receiverName;
    private String receiverPhone;
    private String deliveryAddress;

    private Long shipperId;
    private String shipperName;
    private String shipperPhone;

    private Long warehouseId;
    private String warehouseCode;
    private String warehouseName;
    private String warehouseAddress;
    private String warehousePhone;
    private Double warehouseLatitude;
    private Double warehouseLongitude;
    private BigDecimal totalWeightKg;
    private Double distanceKm;

    private ShippingMethod shippingMethod;
    private String shippingMethodName;
    private BigDecimal shippingFee;
    private BigDecimal orderTotalAmount;
    private String itemsSummary;

    private DeliveryStatus status;
    private String statusDescription;
    private String estimatedDelivery;

    private LocalDateTime createdAt;
    private LocalDateTime assignedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime inTransitAt;
    private LocalDateTime arrivedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime failedAt;

    private String failureReason;
    private String proofImage;
    private Double currentLatitude;
    private Double currentLongitude;
    private LocalDateTime lastLocationUpdate;

    private Boolean codSettled;
    private LocalDateTime codSettledAt;
    private String codSettlementNote;

    private Integer deliveryAttempts;
    private LocalDateTime nextDeliverySchedule;
    private String reAttemptNote;
    private Boolean returnedToWarehouse;
}


