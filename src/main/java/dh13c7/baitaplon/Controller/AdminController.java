package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.DashboardResponse;
import dh13c7.baitaplon.dto.OrderDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.model.OrderStatus;
import dh13c7.baitaplon.service.DashboardService;
import dh13c7.baitaplon.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final DashboardService dashboardService;
    private final OrderService orderService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard() {
        return ResponseEntity.ok(new ApiResponse<>(true,
                "Lấy dữ liệu dashboard thành công", dashboardService.getDashboard()));
    }

    /**
     * GET /api/admin/orders?keyword=&status=&pageNo=0&pageSize=10
     * Tìm kiếm + lọc trạng thái + phân trang
     */
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<PageResponse<OrderDTO>>> getOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize
    ) {
        PageResponse<OrderDTO> result = orderService.searchOrders(keyword, status, pageNo, pageSize);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách đơn hàng thành công", result));
    }
}
