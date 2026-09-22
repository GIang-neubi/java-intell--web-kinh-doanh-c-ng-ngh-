package dh13c7.baitaplon.dto.delivery;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryFailureRequest {

    @NotBlank(message = "Lý do giao hàng thất bại không được để trống")
    private String reason;

    private String note;
}
