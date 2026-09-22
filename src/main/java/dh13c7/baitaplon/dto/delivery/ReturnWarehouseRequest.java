package dh13c7.baitaplon.dto.delivery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnWarehouseRequest {
    /**
     * Lý do hoàn hàng về kho (ví dụ: "Khách bom hàng / từ chối nhận", "Quá 3 lần giao thất bại", "Hủy theo yêu cầu người mua")
     */
    private String reason;

    /**
     * Có tự động hoàn trả số lượng vào tồn kho sản phẩm không (mặc định true)
     */
    @Builder.Default
    private Boolean restock = true;

    /**
     * Ghi chú bổ sung
     */
    private String note;
}
