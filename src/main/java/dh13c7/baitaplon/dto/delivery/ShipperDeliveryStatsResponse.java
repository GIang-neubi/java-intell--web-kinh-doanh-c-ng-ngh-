package dh13c7.baitaplon.dto.delivery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShipperDeliveryStatsResponse {
    private long todayAssigned;
    private long accepted;
    private long pickedUp;
    private long inTransit;
    private long arrived;
    private long delivered;
    private long failed;
    private long totalAssigned;
}
