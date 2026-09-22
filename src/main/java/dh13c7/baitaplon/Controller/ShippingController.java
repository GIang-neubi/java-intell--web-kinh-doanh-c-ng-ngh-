package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.shipping.ShippingCalculationRequest;
import dh13c7.baitaplon.dto.shipping.ShippingCalculationResponse;
import dh13c7.baitaplon.service.ShippingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingController {

    private final ShippingService shippingService;

    /**
     * POST /api/shipping/calculate
     * Tính phí giao hàng theo gói cước và giá trị đơn hàng
     */
    @PostMapping("/calculate")
    public ResponseEntity<ApiResponse<ShippingCalculationResponse>> calculateShippingFee(
            @Valid @RequestBody ShippingCalculationRequest request) {
        ShippingCalculationResponse response = shippingService.calculateShippingFee(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Tính phí vận chuyển thành công", response));
    }

    /**
     * GET /api/shipping/methods?orderAmount=1000000
     * Lấy danh sách toàn bộ các phương thức giao hàng khả dụng
     */
    @GetMapping("/methods")
    public ResponseEntity<ApiResponse<List<ShippingCalculationResponse>>> getShippingMethods(
            @RequestParam(required = false) BigDecimal orderAmount,
            @RequestParam(required = false) BigDecimal totalWeightKg,
            @RequestParam(required = false) Double distanceKm) {
        List<ShippingCalculationResponse> methods = shippingService.getAvailableShippingMethods(orderAmount, totalWeightKg, distanceKm);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách phương thức vận chuyển thành công", methods));
    }
}
