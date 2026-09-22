package dh13c7.baitaplon.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportSummaryDTO {
    // Tổng quan
    private BigDecimal totalRevenue;
    private long totalOrders;
    private long completedOrders;
    private long cancelledOrders;
    private long pendingOrders;

    // Biểu đồ doanh thu theo ngày (trong khoảng range)
    private List<ChartPointDTO> revenueByDay;

    // Top sản phẩm bán chạy
    private List<TopProductDTO> topProducts;

    // Sản phẩm tồn kho thấp
    private List<LowStockDTO> lowStockProducts;
}
