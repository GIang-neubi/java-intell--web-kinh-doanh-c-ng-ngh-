package dh13c7.baitaplon.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO trả về thống kê đánh giá của sản phẩm:
 * - Điểm trung bình, tổng số đánh giá, phân phối từng sao.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewStatsResponse {
    private double averageRating;
    private long reviewCount;
    /** key = số sao (1..5), value = số lượng đánh giá */
    private Map<Integer, Long> distribution;
}
