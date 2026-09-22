package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.*;
import dh13c7.baitaplon.model.OrderStatus;
import dh13c7.baitaplon.repository.OrderItemRepository;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.service.DashboardService;
import dh13c7.baitaplon.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("dd/MM");

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderService orderService;

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        LocalDateTime from = LocalDate.now().minusDays(6).atStartOfDay();

        Map<LocalDate, BigDecimal> revenueMap = new HashMap<>();
        Map<LocalDate, Long> orderCountMap = new HashMap<>();

        for (Object[] row : orderRepository.revenueAndCountByDay(from, OrderStatus.CANCELLED)) {
            LocalDate day = toLocalDate(row[0]);
            revenueMap.put(day, (BigDecimal) row[1]);
            orderCountMap.put(day, ((Number) row[2]).longValue());
        }

        // Fill order counts including cancelled for order chart
        Map<LocalDate, Long> allOrderCountMap = new HashMap<>();
        for (Object[] row : orderRepository.orderCountByDay(from)) {
            LocalDate day = toLocalDate(row[0]);
            allOrderCountMap.put(day, ((Number) row[1]).longValue());
        }

        List<ChartPointDTO> revenueByDay = new ArrayList<>();
        List<ChartPointDTO> ordersByDay = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            String label = day.format(DAY_LABEL);
            BigDecimal revenue = revenueMap.getOrDefault(day, BigDecimal.ZERO);
            long revenueOrders = orderCountMap.getOrDefault(day, 0L);
            long orderCount = allOrderCountMap.getOrDefault(day, 0L);

            revenueByDay.add(ChartPointDTO.builder()
                    .label(label)
                    .value(revenue)
                    .count(revenueOrders)
                    .build());
            ordersByDay.add(ChartPointDTO.builder()
                    .label(label)
                    .value(BigDecimal.valueOf(orderCount))
                    .count(orderCount)
                    .build());
        }

        List<TopProductDTO> topProducts = new ArrayList<>();
        for (Object[] row : orderItemRepository.findTopSellingProducts(
                OrderStatus.CANCELLED, PageRequest.of(0, 5))) {
            topProducts.add(TopProductDTO.builder()
                    .productId(((Number) row[0]).longValue())
                    .productName((String) row[1])
                    .image((String) row[2])
                    .totalSold(((Number) row[3]).longValue())
                    .revenue((BigDecimal) row[4])
                    .build());
        }

        BigDecimal totalRevenue = orderRepository.sumRevenueExcludingCancelled(OrderStatus.CANCELLED);
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }

        return DashboardResponse.builder()
                .totalProducts(productRepository.count())
                .totalUsers(userRepository.count())
                .totalOrders(orderRepository.count())
                .totalRevenue(totalRevenue)
                .recentOrders(orderService.getRecentOrders(8))
                .topProducts(topProducts)
                .revenueByDay(revenueByDay)
                .ordersByDay(ordersByDay)
                .build();
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toLocalDate();
        }
        return LocalDate.parse(value.toString());
    }
}
