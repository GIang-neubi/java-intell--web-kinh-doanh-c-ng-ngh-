package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.*;
import dh13c7.baitaplon.model.OrderStatus;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.repository.OrderItemRepository;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("dd/MM");
    private static final int LOW_STOCK_THRESHOLD = 10;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;

    /**
     * GET /api/admin/reports/summary?from=2026-01-01&to=2026-12-31
     * Tổng hợp báo cáo theo khoảng thời gian
     */
    @GetMapping("/summary")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<ReportSummaryDTO>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        // Mặc định: 30 ngày gần nhất
        if (to == null)   to   = LocalDate.now();
        if (from == null) from = to.minusDays(29);

        LocalDateTime fromDt = from.atStartOfDay();
        LocalDateTime toDt   = to.plusDays(1).atStartOfDay().minusNanos(1);

        // Doanh thu theo ngày
        Map<LocalDate, Object[]> dayMap = new HashMap<>();
        for (Object[] row : orderRepository.revenueByRange(fromDt, toDt, OrderStatus.CANCELLED)) {
            LocalDate day = toLocalDate(row[0]);
            dayMap.put(day, row);
        }

        List<ChartPointDTO> revenueByDay = new ArrayList<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            String label = cursor.format(DAY_LABEL);
            Object[] row = dayMap.get(cursor);
            BigDecimal rev   = row != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            long      count  = row != null ? ((Number) row[2]).longValue() : 0L;
            revenueByDay.add(new ChartPointDTO(label, rev, count));
            cursor = cursor.plusDays(1);
        }

        // Top 10 sản phẩm bán chạy
        List<TopProductDTO> topProducts = new ArrayList<>();
        for (Object[] row : orderItemRepository.findTopSellingProducts(
                OrderStatus.CANCELLED, PageRequest.of(0, 10))) {
            topProducts.add(TopProductDTO.builder()
                    .productId(((Number) row[0]).longValue())
                    .productName((String) row[1])
                    .image((String) row[2])
                    .totalSold(((Number) row[3]).longValue())
                    .revenue((BigDecimal) row[4])
                    .build());
        }

        // Sản phẩm tồn kho thấp
        List<LowStockDTO> lowStock = new ArrayList<>();
        for (Product p : productRepository.findLowStockProducts(LOW_STOCK_THRESHOLD, PageRequest.of(0, 20))) {
            lowStock.add(new LowStockDTO(
                    p.getId(), p.getName(), p.getImage(), p.getStock(),
                    p.getCategory() != null ? p.getCategory().getName() : null));
        }

        // Thống kê đơn
        BigDecimal totalRevenue = orderRepository.sumRevenueByRange(fromDt, toDt, OrderStatus.CANCELLED);
        if (totalRevenue == null) totalRevenue = BigDecimal.ZERO;

        ReportSummaryDTO summary = ReportSummaryDTO.builder()
                .totalRevenue(totalRevenue)
                .totalOrders(orderRepository.countByStatus(OrderStatus.PENDING)
                           + orderRepository.countByStatus(OrderStatus.CONFIRMED)
                           + orderRepository.countByStatus(OrderStatus.PROCESSING)
                           + orderRepository.countByStatus(OrderStatus.SHIPPING)
                           + orderRepository.countByStatus(OrderStatus.DELIVERED)
                           + orderRepository.countByStatus(OrderStatus.CANCELLED))
                .completedOrders(orderRepository.countByStatus(OrderStatus.DELIVERED))
                .cancelledOrders(orderRepository.countByStatus(OrderStatus.CANCELLED))
                .pendingOrders(orderRepository.countByStatus(OrderStatus.PENDING))
                .revenueByDay(revenueByDay)
                .topProducts(topProducts)
                .lowStockProducts(lowStock)
                .build();

        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy báo cáo thành công", summary));
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate ld) return ld;
        if (value instanceof java.sql.Date sd) return sd.toLocalDate();
        if (value instanceof LocalDateTime ldt) return ldt.toLocalDate();
        return LocalDate.parse(value.toString());
    }
}
