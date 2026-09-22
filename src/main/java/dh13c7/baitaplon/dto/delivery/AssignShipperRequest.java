package dh13c7.baitaplon.dto.delivery;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignShipperRequest {

    @NotNull(message = "ID Shipper không được để trống")
    private Long shipperId;

    private String note;
}
