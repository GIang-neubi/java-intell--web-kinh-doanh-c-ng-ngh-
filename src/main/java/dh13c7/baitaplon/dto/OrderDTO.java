package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.OrderStatus;
import dh13c7.baitaplon.model.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDTO {
    private Long id;
    private String orderCode;
    private BigDecimal subtotal;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private String phone;
    private PaymentMethod paymentMethod;
    private OrderStatus status;
    private LocalDateTime createdAt;
    private List<OrderItemDTO> items;
    private Long userId;
    private String customerName;
    private String customerUsername;
    private BigDecimal discountAmount;
    private String voucherCode;
    private String paymentStatus;
    private String transferContent;
    private dh13c7.baitaplon.model.ShippingMethod shippingMethod;
    private BigDecimal shippingFee;
}
