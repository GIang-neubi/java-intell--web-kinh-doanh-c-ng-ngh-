package dh13c7.baitaplon.dto.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BroadcastNotificationRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
    private String title;

    @NotBlank(message = "Nội dung không được để trống")
    @Size(max = 1000, message = "Nội dung tối đa 1000 ký tự")
    private String message;

    @Builder.Default
    private String type = "PROMOTION"; // ORDER, DELIVERY, PAYMENT, PROMOTION, SYSTEM

    private String targetUrl;

    /** ALL, ROLE_USER, ROLE_SHIPPER, ROLE_ADMIN */
    @Builder.Default
    private String targetRole = "ALL";

    /** Nếu chỉ định gửi riêng cho 1 user */
    private Long targetUserId;
}
