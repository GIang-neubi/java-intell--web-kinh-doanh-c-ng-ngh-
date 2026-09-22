package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.shipping.ShippingCalculationRequest;
import dh13c7.baitaplon.dto.shipping.ShippingCalculationResponse;
import dh13c7.baitaplon.model.ShippingMethod;

import java.math.BigDecimal;
import java.util.List;

public interface ShippingService {

    /**
     * Tính phí giao hàng dựa theo request
     */
    ShippingCalculationResponse calculateShippingFee(ShippingCalculationRequest request);

    /**
     * Lấy danh sách các phương thức giao hàng khả dụng kèm phí và thời gian dự kiến
     */
    List<ShippingCalculationResponse> getAvailableShippingMethods(BigDecimal orderAmount);

    List<ShippingCalculationResponse> getAvailableShippingMethods(BigDecimal orderAmount, BigDecimal totalWeightKg, Double distanceKm);

    /**
     * Lấy mức phí cho một phương thức giao hàng (backward compatible)
     */
    BigDecimal getFeeForMethod(ShippingMethod method, BigDecimal orderAmount);

    /**
     * Tính phí vận chuyển đầy đủ theo công thức: BaseFee + WeightRate * weight + DistanceRate * distance
     */
    BigDecimal calculateFee(ShippingMethod method, BigDecimal orderAmount, BigDecimal totalWeightKg, Double distanceKm);
}
