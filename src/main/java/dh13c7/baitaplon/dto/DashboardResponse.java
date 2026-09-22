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
public class DashboardResponse {
    private long totalProducts;
    private long totalUsers;
    private long totalOrders;
    private BigDecimal totalRevenue;
    private List<OrderDTO> recentOrders;
    private List<TopProductDTO> topProducts;
    private List<ChartPointDTO> revenueByDay;
    private List<ChartPointDTO> ordersByDay;
}
