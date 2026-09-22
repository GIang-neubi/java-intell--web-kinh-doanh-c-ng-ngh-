package dh13c7.baitaplon.dto.delivery;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryOtpVerifyRequest {

    @NotBlank(message = "Mã OTP không được để trống")
    private String otp;

    private String proofImage;

    private String note;
}
