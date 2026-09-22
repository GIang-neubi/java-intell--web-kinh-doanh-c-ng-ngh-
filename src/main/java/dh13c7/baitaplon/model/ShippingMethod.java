package dh13c7.baitaplon.model;

import lombok.Getter;

import java.math.BigDecimal;

@Getter
public enum ShippingMethod {
    STANDARD("Giao hàng tiêu chuẩn", "2–4 ngày", BigDecimal.valueOf(15000), BigDecimal.valueOf(3000), BigDecimal.valueOf(2000), BigDecimal.valueOf(20000)),
    EXPRESS("Giao hàng nhanh", "1–2 ngày", BigDecimal.valueOf(25000), BigDecimal.valueOf(4000), BigDecimal.valueOf(3000), BigDecimal.valueOf(30000)),
    SAME_DAY("Giao hỏa tốc trong ngày", "Trong ngày", BigDecimal.valueOf(40000), BigDecimal.valueOf(5000), BigDecimal.valueOf(4000), BigDecimal.valueOf(50000));

    private final String displayName;
    private final String estimatedTime;
    private final BigDecimal baseFee;
    private final BigDecimal distanceRate;
    private final BigDecimal weightRate;
    private final BigDecimal minimumFee;

    ShippingMethod(String displayName, String estimatedTime, BigDecimal baseFee, BigDecimal distanceRate, BigDecimal weightRate, BigDecimal minimumFee) {
        this.displayName = displayName;
        this.estimatedTime = estimatedTime;
        this.baseFee = baseFee;
        this.distanceRate = distanceRate;
        this.weightRate = weightRate;
        this.minimumFee = minimumFee;
    }
}
