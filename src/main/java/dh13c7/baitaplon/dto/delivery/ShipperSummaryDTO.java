package dh13c7.baitaplon.dto.delivery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShipperSummaryDTO {
    private Long id;
    private String username;
    private String fullName;
    private String phone;
    private String email;
    private boolean enabled;
    private long activeDeliveryCount;
    private long completedDeliveryCount;
}
