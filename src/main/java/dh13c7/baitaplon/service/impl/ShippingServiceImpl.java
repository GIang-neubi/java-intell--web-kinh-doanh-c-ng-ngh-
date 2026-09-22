package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.shipping.ShippingCalculationRequest;
import dh13c7.baitaplon.dto.shipping.ShippingCalculationResponse;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.model.ShippingMethod;
import dh13c7.baitaplon.model.Warehouse;
import dh13c7.baitaplon.repository.WarehouseRepository;
import dh13c7.baitaplon.service.DistanceService;
import dh13c7.baitaplon.service.ShippingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;

@Service
@Slf4j
public class ShippingServiceImpl implements ShippingService {

    private final DistanceService distanceService;
    private final WarehouseRepository warehouseRepository;

    @Autowired
    public ShippingServiceImpl(DistanceService distanceService, WarehouseRepository warehouseRepository) {
        this.distanceService = distanceService;
        this.warehouseRepository = warehouseRepository;
    }

    public ShippingServiceImpl() {
        this.distanceService = new DistanceServiceImpl();
        this.warehouseRepository = null;
    }

    @Override
    public ShippingCalculationResponse calculateShippingFee(ShippingCalculationRequest request) {
        if (request == null || request.getShippingMethod() == null) {
            throw new BadRequestException("Phương thức vận chuyển không hợp lệ");
        }

        ShippingMethod method = request.getShippingMethod();
        BigDecimal totalWeightKg = request.getTotalWeightKg() != null ? request.getTotalWeightKg() : BigDecimal.ZERO;
        Double distanceKm = request.getDistanceKm();

        // Nếu chưa có distanceKm nhưng có tọa độ khách hàng, tự động tính khoảng cách tới kho
        if (distanceKm == null && request.getCustomerLatitude() != null && request.getCustomerLongitude() != null) {
            Warehouse warehouse = null;
            if (request.getWarehouseId() != null && warehouseRepository != null) {
                warehouse = warehouseRepository.findById(request.getWarehouseId()).orElse(null);
            }
            if (warehouse == null && warehouseRepository != null) {
                warehouse = warehouseRepository.findByStatusOrderByNameAsc("ACTIVE")
                        .stream().findFirst().orElse(null);
            }

            if (warehouse != null && warehouse.getLatitude() != null && warehouse.getLongitude() != null) {
                distanceKm = distanceService.calculateDistanceKm(
                        warehouse.getLatitude(), warehouse.getLongitude(),
                        request.getCustomerLatitude(), request.getCustomerLongitude()
                );
                log.info("Tính khoảng cách từ kho {} ({}, {}) đến ({}, {}): {} km",
                        warehouse.getWarehouseCode(), warehouse.getLatitude(), warehouse.getLongitude(),
                        request.getCustomerLatitude(), request.getCustomerLongitude(), distanceKm);
            }
        }

        BigDecimal baseFee = method.getBaseFee();
        BigDecimal distanceFee = (distanceKm != null && distanceKm > 0)
                ? method.getDistanceRate().multiply(BigDecimal.valueOf(distanceKm))
                : BigDecimal.ZERO;
        BigDecimal weightFee = totalWeightKg.compareTo(BigDecimal.ZERO) > 0
                ? method.getWeightRate().multiply(totalWeightKg)
                : BigDecimal.ZERO;
        BigDecimal minimumFee = method.getMinimumFee();

        // Công thức chính thức Phase 2: MAX(MinimumFee, BaseFee + Distance * DistanceRate + TotalWeight * WeightRate)
        BigDecimal rawFee = baseFee.add(distanceFee).add(weightFee);
        BigDecimal feeBeforeRounding = rawFee.max(minimumFee);

        // Quy tắc làm tròn lên (CEILING) đến hàng 1.000đ gần nhất (VD: 40.316đ -> 41.000đ)
        BigDecimal thousand = BigDecimal.valueOf(1000);
        BigDecimal finalFee = feeBeforeRounding.divide(thousand, 0, RoundingMode.CEILING).multiply(thousand);

        String description = switch (method) {
            case STANDARD -> "Giao hàng qua mạng lưới bưu cục H&G (2–4 ngày)";
            case EXPRESS -> "Giao hàng ưu tiên đường bay/hỏa tốc liên tỉnh (1–2 ngày)";
            case SAME_DAY -> "Giao nhanh bằng shipper nội thành trong ngày (2-4 giờ)";
        };

        return ShippingCalculationResponse.builder()
                .shippingMethod(method)
                .displayName(method.getDisplayName())
                .shippingFee(finalFee)
                .baseFee(baseFee)
                .distanceFee(distanceFee)
                .weightFee(weightFee)
                .minimumFee(minimumFee)
                .estimatedDelivery(method.getEstimatedTime())
                .description(description)
                .freeShippingApplied(false)
                .totalWeightKg(totalWeightKg)
                .distanceKm(distanceKm)
                .build();
    }

    @Override
    public List<ShippingCalculationResponse> getAvailableShippingMethods(BigDecimal orderAmount) {
        return getAvailableShippingMethods(orderAmount, null, null);
    }

    @Override
    public List<ShippingCalculationResponse> getAvailableShippingMethods(BigDecimal orderAmount, BigDecimal totalWeightKg, Double distanceKm) {
        BigDecimal safeAmount = orderAmount != null ? orderAmount : BigDecimal.ZERO;
        List<ShippingCalculationResponse> list = new ArrayList<>();
        for (ShippingMethod method : ShippingMethod.values()) {
            list.add(calculateShippingFee(ShippingCalculationRequest.builder()
                    .shippingMethod(method)
                    .orderAmount(safeAmount)
                    .totalWeightKg(totalWeightKg)
                    .distanceKm(distanceKm)
                    .build()));
        }
        return list;
    }

    @Override
    public BigDecimal getFeeForMethod(ShippingMethod method, BigDecimal orderAmount) {
        return calculateFee(method, orderAmount, null, null);
    }

    @Override
    public BigDecimal calculateFee(ShippingMethod method, BigDecimal orderAmount, BigDecimal totalWeightKg, Double distanceKm) {
        if (method == null) {
            method = ShippingMethod.STANDARD;
        }

        BigDecimal baseFee = method.getBaseFee();
        BigDecimal distanceFee = (distanceKm != null && distanceKm > 0)
                ? method.getDistanceRate().multiply(BigDecimal.valueOf(distanceKm))
                : BigDecimal.ZERO;
        BigDecimal weightFee = (totalWeightKg != null && totalWeightKg.compareTo(BigDecimal.ZERO) > 0)
                ? method.getWeightRate().multiply(totalWeightKg)
                : BigDecimal.ZERO;
        BigDecimal minimumFee = method.getMinimumFee();

        // MAX(MinimumFee, BaseFee + Distance * DistanceRate + TotalWeight * WeightRate)
        BigDecimal rawFee = baseFee.add(distanceFee).add(weightFee);
        BigDecimal feeBeforeRounding = rawFee.max(minimumFee);

        // Làm tròn lên (CEILING) đến hàng nghìn đồng gần nhất (VD: 40.316 -> 41.000)
        BigDecimal thousand = BigDecimal.valueOf(1000);
        return feeBeforeRounding.divide(thousand, 0, RoundingMode.CEILING).multiply(thousand);
    }
}
