package dh13c7.baitaplon.dto.delivery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryStatsResponse {
    private long total;
    private long pendingAssignment;
    private long assigned;
    private long pickedUp;
    private long inTransit;
    private long arrived;
    private long delivered;
    private long failed;
    private long cancelled;
    private long activeShippers;
}
