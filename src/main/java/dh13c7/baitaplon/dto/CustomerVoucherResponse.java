package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.DiscountType;
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
public class CustomerVoucherResponse {

    private Long id;
    private String code;
    private String description;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;
    private BigDecimal maxDiscount;
    private Integer quantity;
    private Integer usedQuantity;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    /**
     * Trạng thái voucher đối với khách hàng:
     * AVAILABLE, USED, EXPIRED, UPCOMING, OUT_OF_STOCK, INACTIVE
     */
    private String status;

    /**
     * Nhãn hiển thị tiếng Việt:
     * "Khả dụng", "Đã sử dụng", "Đã hết hạn", "Sắp diễn ra", "Đã hết lượt", "Tạm dừng"
     */
    private String statusLabel;

    /**
     * Khách hàng hiện tại đã sử dụng mã này trong đơn hàng nào chưa
     */
    private boolean used;

    /**
     * Khách hàng có thể sao chép và áp dụng ngay bây giờ hay không (status == AVAILABLE)
     */
    private boolean usable;
}
