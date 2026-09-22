package dh13c7.baitaplon.model;

import lombok.Getter;

@Getter
public enum DeliveryStatus {
    PENDING_ASSIGNMENT("Chờ phân công shipper"),
    ASSIGNED("Đã phân công shipper"),
    SHIPPER_ACCEPTED("Shipper đã nhận đơn"),
    PICKED_UP("Shipper đã lấy hàng"),
    IN_TRANSIT("Đang giao hàng"),
    ARRIVED("Đã đến địa chỉ nhận"),
    DELIVERED("Giao hàng thành công"),
    DELIVERY_FAILED("Giao hàng thất bại"),
    CANCELLED("Đã hủy giao hàng");

    private final String description;

    DeliveryStatus(String description) {
        this.description = description;
    }
}
