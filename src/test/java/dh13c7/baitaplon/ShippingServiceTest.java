package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.shipping.ShippingCalculationRequest;
import dh13c7.baitaplon.dto.shipping.ShippingCalculationResponse;
import dh13c7.baitaplon.model.ShippingMethod;
import dh13c7.baitaplon.service.ShippingService;
import dh13c7.baitaplon.service.impl.ShippingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ShippingService - Fee Calculation and Method Listing Unit Tests")
class ShippingServiceTest {

    private ShippingService shippingService;

    @BeforeEach
    void setUp() {
        shippingService = new ShippingServiceImpl();
    }

    @Test
    @DisplayName("Gói STANDARD: Phí tối thiểu MinimumFee = 20.000đ khi không có cước khoảng cách/khối lượng")
    void standardMethod_minimumFee_shouldBe20k() {
        var req = ShippingCalculationRequest.builder()
                .shippingMethod(ShippingMethod.STANDARD)
                .orderAmount(BigDecimal.valueOf(2000000))
                .build();

        ShippingCalculationResponse res = shippingService.calculateShippingFee(req);

        assertThat(res.getShippingMethod()).isEqualTo(ShippingMethod.STANDARD);
        // BaseFee 15.000 < MinimumFee 20.000 -> 20.000đ
        assertThat(res.getShippingFee()).isEqualByComparingTo(BigDecimal.valueOf(20000));
        assertThat(res.getMinimumFee()).isEqualByComparingTo(BigDecimal.valueOf(20000));
        assertThat(res.getEstimatedDelivery()).isEqualTo("2–4 ngày");
    }

    @Test
    @DisplayName("Gói EXPRESS: Phí tối thiểu MinimumFee = 30.000đ khi không có phụ phí")
    void expressMethod_minimumFee_shouldBe30k() {
        var req = ShippingCalculationRequest.builder()
                .shippingMethod(ShippingMethod.EXPRESS)
                .orderAmount(BigDecimal.valueOf(5000000))
                .build();

        ShippingCalculationResponse res = shippingService.calculateShippingFee(req);

        assertThat(res.getShippingMethod()).isEqualTo(ShippingMethod.EXPRESS);
        // BaseFee 25.000 < MinimumFee 30.000 -> 30.000đ
        assertThat(res.getShippingFee()).isEqualByComparingTo(BigDecimal.valueOf(30000));
        assertThat(res.getEstimatedDelivery()).isEqualTo("1–2 ngày");
    }

    @Test
    @DisplayName("Gói SAME_DAY: Phí tối thiểu MinimumFee = 50.000đ khi không có phụ phí")
    void sameDayMethod_minimumFee_shouldBe50k() {
        var req = ShippingCalculationRequest.builder()
                .shippingMethod(ShippingMethod.SAME_DAY)
                .orderAmount(BigDecimal.valueOf(5000000))
                .build();

        ShippingCalculationResponse res = shippingService.calculateShippingFee(req);

        assertThat(res.getShippingMethod()).isEqualTo(ShippingMethod.SAME_DAY);
        // BaseFee 40.000 < MinimumFee 50.000 -> 50.000đ
        assertThat(res.getShippingFee()).isEqualByComparingTo(BigDecimal.valueOf(50000));
        assertThat(res.getEstimatedDelivery()).isEqualTo("Trong ngày");
    }

    @Test
    @DisplayName("Lấy danh sách phương thức: Trả về đầy đủ 3 gói dịch vụ")
    void getAvailableShippingMethods_shouldReturnAllThreeMethods() {
        List<ShippingCalculationResponse> methods = shippingService.getAvailableShippingMethods(BigDecimal.valueOf(1000000));

        assertThat(methods).hasSize(3);
        assertThat(methods).extracting(ShippingCalculationResponse::getShippingMethod)
                .containsExactly(ShippingMethod.STANDARD, ShippingMethod.EXPRESS, ShippingMethod.SAME_DAY);
    }

    @Test
    @DisplayName("Test Section 26 chính thức: STANDARD, Distance 8km, Weight 3kg -> 45.000đ")
    void calculateShippingFee_section26OfficialExample_shouldBe45k() {
        // 15.000 + 8 * 3.000 + 3 * 2.000 = 15.000 + 24.000 + 6.000 = 45.000 VND
        var req = ShippingCalculationRequest.builder()
                .shippingMethod(ShippingMethod.STANDARD)
                .orderAmount(BigDecimal.valueOf(51490000))
                .distanceKm(8.0)
                .totalWeightKg(BigDecimal.valueOf(3.0))
                .build();

        ShippingCalculationResponse res = shippingService.calculateShippingFee(req);

        assertThat(res.getShippingFee()).isEqualByComparingTo(BigDecimal.valueOf(45000));
        assertThat(res.getBaseFee()).isEqualByComparingTo(BigDecimal.valueOf(15000));
        assertThat(res.getDistanceFee()).isEqualByComparingTo(BigDecimal.valueOf(24000));
        assertThat(res.getWeightFee()).isEqualByComparingTo(BigDecimal.valueOf(6000));
        assertThat(res.getMinimumFee()).isEqualByComparingTo(BigDecimal.valueOf(20000));
    }

    @Test
    @DisplayName("Quy tắc làm tròn lên CEILING đến hàng 1.000đ: 25.700đ -> 26.000đ")
    void calculateShippingFee_ceilingRounding_shouldRoundUpToThousand() {
        // STANDARD: Base 15.000 + 3.5km * 3.000 (10.500) + 0.1kg * 2.000 (200) = 25.700 -> làm tròn lên 26.000đ
        var req = ShippingCalculationRequest.builder()
                .shippingMethod(ShippingMethod.STANDARD)
                .distanceKm(3.5)
                .totalWeightKg(BigDecimal.valueOf(0.1))
                .build();

        ShippingCalculationResponse res = shippingService.calculateShippingFee(req);

        assertThat(res.getShippingFee()).isEqualByComparingTo(BigDecimal.valueOf(26000));
    }
}
