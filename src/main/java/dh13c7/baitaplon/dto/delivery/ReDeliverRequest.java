package dh13c7.baitaplon.dto.delivery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReDeliverRequest {
    /**
     * ID shipper được gán lại (tùy chọn; nếu không gửi sẽ giữ nguyên shipper hiện tại nếu có)
     */
    private Long shipperId;

    /**
     * Ngày giờ hẹn giao lại (tùy chọn)
     */
    private LocalDateTime nextDeliverySchedule;

    /**
     * Ghi chú hướng dẫn cho shipper hoặc CSKH
     */
    private String note;
}
