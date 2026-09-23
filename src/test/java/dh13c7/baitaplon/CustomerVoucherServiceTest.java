package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.CustomerVoucherResponse;
import dh13c7.baitaplon.model.DiscountType;
import dh13c7.baitaplon.model.Voucher;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.VoucherRepository;
import dh13c7.baitaplon.service.impl.VoucherServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("CustomerVoucherService - My Vouchers Unit Tests")
class CustomerVoucherServiceTest {

    @Mock
    private VoucherRepository voucherRepository;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private VoucherServiceImpl voucherService;

    private Voucher availableVoucher;
    private Voucher expiredVoucher;
    private Voucher upcomingVoucher;
    private Voucher outOfStockVoucher;
    private Voucher inactiveVoucher;
    private Voucher usedVoucher;

    @BeforeEach
    void setUp() {
        LocalDateTime now = LocalDateTime.now();

        availableVoucher = Voucher.builder()
                .id(1L)
                .code("DISCOUNT10")
                .description("Giảm 10% đơn từ 200k")
                .discountType(DiscountType.PERCENT)
                .discountValue(new BigDecimal("10"))
                .minOrderValue(new BigDecimal("200000"))
                .maxDiscount(new BigDecimal("50000"))
                .quantity(100)
                .usedQuantity(10)
                .startDate(now.minusDays(5))
                .endDate(now.plusDays(10))
                .active(true)
                .build();

        expiredVoucher = Voucher.builder()
                .id(2L)
                .code("EXPIRED50K")
                .description("Giảm 50k đã hết hạn")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000"))
                .minOrderValue(BigDecimal.ZERO)
                .quantity(50)
                .usedQuantity(5)
                .startDate(now.minusDays(30))
                .endDate(now.minusDays(1))
                .active(true)
                .build();

        upcomingVoucher = Voucher.builder()
                .id(3L)
                .code("FUTURE15")
                .description("Giảm 15% sắp diễn ra")
                .discountType(DiscountType.PERCENT)
                .discountValue(new BigDecimal("15"))
                .minOrderValue(new BigDecimal("300000"))
                .quantity(20)
                .usedQuantity(0)
                .startDate(now.plusDays(2))
                .endDate(now.plusDays(15))
                .active(true)
                .build();

        outOfStockVoucher = Voucher.builder()
                .id(4L)
                .code("LIMITED100K")
                .description("Giảm 100k đã hết lượt")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("100000"))
                .minOrderValue(new BigDecimal("500000"))
                .quantity(10)
                .usedQuantity(10)
                .startDate(now.minusDays(3))
                .endDate(now.plusDays(5))
                .active(true)
                .build();

        inactiveVoucher = Voucher.builder()
                .id(5L)
                .code("PAUSED20")
                .description("Voucher tạm dừng")
                .discountType(DiscountType.PERCENT)
                .discountValue(new BigDecimal("20"))
                .minOrderValue(BigDecimal.ZERO)
                .quantity(50)
                .usedQuantity(0)
                .startDate(now.minusDays(2))
                .endDate(now.plusDays(10))
                .active(false)
                .build();

        usedVoucher = Voucher.builder()
                .id(6L)
                .code("ALREADYUSED")
                .description("Mã khách đã dùng")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("30000"))
                .minOrderValue(BigDecimal.ZERO)
                .quantity(100)
                .usedQuantity(25)
                .startDate(now.minusDays(5))
                .endDate(now.plusDays(10))
                .active(true)
                .build();

        when(voucherRepository.findAll(any(Sort.class)))
                .thenReturn(List.of(availableVoucher, expiredVoucher, upcomingVoucher, outOfStockVoucher, inactiveVoucher, usedVoucher));
    }

    @Test
    @DisplayName("1. Khách hàng xem danh sách voucher: Voucher khả dụng có status AVAILABLE và usable = true")
    void getMyVouchers_AvailableVoucher_ReturnsAvailableAndUsable() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of());

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "ALL");

        assertThat(result).hasSize(6);
        CustomerVoucherResponse available = result.stream()
                .filter(v -> v.getCode().equals("DISCOUNT10"))
                .findFirst().orElseThrow();

        assertThat(available.getStatus()).isEqualTo("AVAILABLE");
        assertThat(available.getStatusLabel()).isEqualTo("Khả dụng");
        assertThat(available.isUsable()).isTrue();
        assertThat(available.isUsed()).isFalse();
        assertThat(available.getDiscountValue()).isEqualByComparingTo("10");
        assertThat(available.getMinOrderValue()).isEqualByComparingTo("200000");
        assertThat(available.getMaxDiscount()).isEqualByComparingTo("50000");
    }

    @Test
    @DisplayName("2. Khách hàng đã dùng voucher trong đơn hàng: status là USED và used = true")
    void getMyVouchers_UserUsed_ReturnsUsed() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of("ALREADYUSED"));

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "ALL");

        CustomerVoucherResponse used = result.stream()
                .filter(v -> v.getCode().equals("ALREADYUSED"))
                .findFirst().orElseThrow();

        assertThat(used.getStatus()).isEqualTo("USED");
        assertThat(used.getStatusLabel()).isEqualTo("Đã sử dụng");
        assertThat(used.isUsed()).isTrue();
        assertThat(used.isUsable()).isFalse();
    }

    @Test
    @DisplayName("3. Voucher quá ngày kết thúc: status là EXPIRED")
    void getMyVouchers_Expired_ReturnsExpired() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of());

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "ALL");

        CustomerVoucherResponse expired = result.stream()
                .filter(v -> v.getCode().equals("EXPIRED50K"))
                .findFirst().orElseThrow();

        assertThat(expired.getStatus()).isEqualTo("EXPIRED");
        assertThat(expired.getStatusLabel()).isEqualTo("Đã hết hạn");
        assertThat(expired.isUsable()).isFalse();
    }

    @Test
    @DisplayName("4. Voucher chưa tới ngày bắt đầu: status là UPCOMING")
    void getMyVouchers_Upcoming_ReturnsUpcoming() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of());

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "ALL");

        CustomerVoucherResponse upcoming = result.stream()
                .filter(v -> v.getCode().equals("FUTURE15"))
                .findFirst().orElseThrow();

        assertThat(upcoming.getStatus()).isEqualTo("UPCOMING");
        assertThat(upcoming.getStatusLabel()).isEqualTo("Sắp diễn ra");
        assertThat(upcoming.isUsable()).isFalse();
    }

    @Test
    @DisplayName("5. Voucher đã dùng hết số lượng: status là OUT_OF_STOCK")
    void getMyVouchers_OutOfStock_ReturnsOutOfStock() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of());

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "ALL");

        CustomerVoucherResponse outOfStock = result.stream()
                .filter(v -> v.getCode().equals("LIMITED100K"))
                .findFirst().orElseThrow();

        assertThat(outOfStock.getStatus()).isEqualTo("OUT_OF_STOCK");
        assertThat(outOfStock.getStatusLabel()).isEqualTo("Đã hết lượt");
        assertThat(outOfStock.isUsable()).isFalse();
    }

    @Test
    @DisplayName("6. Voucher bị Admin vô hiệu hóa: status là INACTIVE")
    void getMyVouchers_Inactive_ReturnsInactive() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of());

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "ALL");

        CustomerVoucherResponse inactive = result.stream()
                .filter(v -> v.getCode().equals("PAUSED20"))
                .findFirst().orElseThrow();

        assertThat(inactive.getStatus()).isEqualTo("INACTIVE");
        assertThat(inactive.getStatusLabel()).isEqualTo("Tạm dừng");
        assertThat(inactive.isUsable()).isFalse();
    }

    @Test
    @DisplayName("7. Lọc theo AVAILABLE: chỉ trả về các voucher khả dụng")
    void filter_AvailableOnly_ReturnsOnlyAvailable() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of());

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "AVAILABLE");

        assertThat(result).isNotEmpty();
        assertThat(result).allMatch(v -> "AVAILABLE".equals(v.getStatus()));
    }

    @Test
    @DisplayName("8. Lọc theo USED: chỉ trả về các voucher người dùng đã sử dụng")
    void filter_UsedOnly_ReturnsOnlyUsed() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of("ALREADYUSED"));

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "USED");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("ALREADYUSED");
        assertThat(result.get(0).getStatus()).isEqualTo("USED");
    }

    @Test
    @DisplayName("9. Lọc theo EXPIRED: chỉ trả về các voucher đã hết hạn")
    void filter_ExpiredOnly_ReturnsOnlyExpired() {
        when(orderRepository.findVoucherCodesUsedByUserId(1L)).thenReturn(List.of());

        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(1L, "EXPIRED");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("EXPIRED50K");
        assertThat(result.get(0).getStatus()).isEqualTo("EXPIRED");
    }

    @Test
    @DisplayName("10. Người dùng chưa đăng nhập hoặc null userId: xử lý an toàn không quăng lỗi")
    void unauthenticatedOrNullUser_HandlesGracefully() {
        List<CustomerVoucherResponse> result = voucherService.getMyVouchers(null, "ALL");

        assertThat(result).hasSize(6);
        assertThat(result).allMatch(v -> !v.isUsed());
    }
}
