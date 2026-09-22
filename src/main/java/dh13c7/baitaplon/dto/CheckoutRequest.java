package dh13c7.baitaplon.dto;

import dh13c7.baitaplon.model.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckoutRequest {
    @NotBlank(message = "Địa chỉ giao hàng không được để trống")
    private String shippingAddress;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    private PaymentMethod paymentMethod;

    // Tuỳ chọn: mã voucher
    private String voucherCode;

    // Phương thức vận chuyển (STANDARD, EXPRESS, SAME_DAY) - mặc định STANDARD
    private dh13c7.baitaplon.model.ShippingMethod shippingMethod;

    // Tuỳ chọn: toạ độ khách hàng để tính khoảng cách chính xác
    private Double customerLatitude;
    private Double customerLongitude;
}
