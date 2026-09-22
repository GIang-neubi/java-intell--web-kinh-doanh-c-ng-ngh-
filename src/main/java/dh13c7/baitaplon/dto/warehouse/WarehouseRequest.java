package dh13c7.baitaplon.dto.warehouse;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class WarehouseRequest {

    @NotBlank(message = "Mã kho không được để trống")
    @Size(max = 20, message = "Mã kho tối đa 20 ký tự")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Mã kho chỉ được chứa chữ hoa, số, gạch dưới, gạch ngang")
    private String warehouseCode;

    @NotBlank(message = "Tên kho không được để trống")
    @Size(max = 200, message = "Tên kho tối đa 200 ký tự")
    private String name;

    @NotBlank(message = "Địa chỉ kho không được để trống")
    private String address;

    @DecimalMin(value = "-90.0", message = "Vĩ độ phải trong khoảng -90 đến 90")
    @DecimalMax(value = "90.0", message = "Vĩ độ phải trong khoảng -90 đến 90")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "Kinh độ phải trong khoảng -180 đến 180")
    @DecimalMax(value = "180.0", message = "Kinh độ phải trong khoảng -180 đến 180")
    private Double longitude;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    /** ACTIVE hoặc INACTIVE */
    private String status = "ACTIVE";
}
