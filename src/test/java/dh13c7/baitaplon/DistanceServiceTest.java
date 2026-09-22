package dh13c7.baitaplon;

import dh13c7.baitaplon.service.DistanceService;
import dh13c7.baitaplon.service.impl.DistanceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DistanceService - Haversine Distance Unit Tests")
class DistanceServiceTest {

    private DistanceService distanceService;

    @BeforeEach
    void setUp() {
        distanceService = new DistanceServiceImpl();
    }

    @Test
    @DisplayName("Tính khoảng cách Hà Nội - TP.HCM (~1.140 km)")
    void calculateDistance_HaNoi_To_HCM() {
        // Hà Nội (21.028511, 105.804817) -> TP.HCM (10.776889, 106.700806)
        Double distance = distanceService.calculateDistanceKm(21.028511, 105.804817, 10.776889, 106.700806);

        assertThat(distance).isNotNull();
        // Khoảng cách đường chim bay giữa Hà Nội và Sài Gòn khoảng 1.130 - 1.160 km
        assertThat(distance).isBetween(1130.0, 1160.0);
    }

    @Test
    @DisplayName("Khoảng cách giữa cùng một tọa độ là 0 km")
    void calculateDistance_SameCoordinates_ShouldBeZero() {
        Double distance = distanceService.calculateDistanceKm(21.028511, 105.804817, 21.028511, 105.804817);

        assertThat(distance).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Khoảng cách thiếu tọa độ trả về null")
    void calculateDistance_MissingCoordinates_ShouldReturnNull() {
        Double distance = distanceService.calculateDistanceKm(null, 105.804817, 10.776889, 106.700806);
        assertThat(distance).isNull();

        Double distance2 = distanceService.calculateDistanceKm(21.028511, 105.804817, null, null);
        assertThat(distance2).isNull();
    }

    @Test
    @DisplayName("Tọa độ vượt giới hạn hợp lệ (-90..90, -180..180) trả về null")
    void calculateDistance_OutOfBounds_ShouldReturnNull() {
        Double distance = distanceService.calculateDistanceKm(95.0, 105.0, 10.0, 106.0);
        assertThat(distance).isNull();
    }
}
