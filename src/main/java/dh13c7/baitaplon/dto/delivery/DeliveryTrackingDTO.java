package dh13c7.baitaplon.dto.delivery;

import dh13c7.baitaplon.model.DeliveryStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryTrackingDTO {
    private Long id;
    private DeliveryStatus status;
    private String statusDescription;
    private String note;
    private Double latitude;
    private Double longitude;
    private LocalDateTime createdAt;
}
