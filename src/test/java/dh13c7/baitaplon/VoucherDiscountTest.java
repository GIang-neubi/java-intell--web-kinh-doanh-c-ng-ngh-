package dh13c7.baitaplon;

import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.model.DiscountType;
import dh13c7.baitaplon.model.Order;
import dh13c7.baitaplon.model.OrderStatus;
import dh13c7.baitaplon.model.PaymentMethod;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.model.Voucher;
import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.Cart;
import dh13c7.baitaplon.model.CartItem;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.dto.CheckoutRequest;
import dh13c7.baitaplon.repository.*;
import dh13c7.baitaplon.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("OrderService - Voucher Discount Logic Unit Tests")
class VoucherDiscountTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private CartRepository cartRepository;
    @Mock private ProductRepository productRepository;
    @Mock private UserRepository userRepository;
    @Mock private VoucherRepository voucherRepository;
    @Mock private dh13c7.baitaplon.service.ShippingService shippingService;
    @Mock private dh13c7.baitaplon.service.DeliveryService deliveryService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User user;
    private Product product;
    private Cart cart;
    private CartItem cartItem;
    private CheckoutRequest checkoutRequest;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).username("customer").email("c@hg.com")
                .password("pass").role(Role.ROLE_USER).enabled(true).build();

        product = Product.builder().id(10L).name("Sony A7 IV")
                .price(new BigDecimal("10000000")).stock(10).status(true).build();

        cartItem = new CartItem();
        cartItem.setProduct(product);
        cartItem.setQuantity(2); // Total = 20,000,000

        cart = new Cart();
        cart.setUser(user);
        cart.setItems(new ArrayList<>(List.of(cartItem)));

        checkoutRequest = new CheckoutRequest();
        checkoutRequest.setShippingAddress("123 Đường Test, HCM");
        checkoutRequest.setPhone("0912345678");
        checkoutRequest.setPaymentMethod(PaymentMethod.COD);

        // Common mocks
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(100L);
            o.setOrderItems(new ArrayList<>());
            return o;
        });
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        when(shippingService.getFeeForMethod(any(), any())).thenReturn(BigDecimal.ZERO);
    }

    // ─────────────────────────────────────────────
    // TEST: Voucher PERCENT
    // ─────────────────────────────────────────────

    @Test
    @DisplayName("Voucher PERCENT 20%: tính đúng discount = totalAmount * 20%")
    void voucher_percent20_shouldApplyCorrectDiscount() {
        Voucher voucher = buildVoucher("SALE20", DiscountType.PERCENT,
                new BigDecimal("20"), BigDecimal.ZERO, null, 0);

        when(voucherRepository.findByCodeIgnoreCase("SALE20")).thenReturn(Optional.of(voucher));
        checkoutRequest.setVoucherCode("SALE20");

        var result = orderService.checkout(1L, checkoutRequest);

        // totalAmount = 20,000,000; discount = 20% = 4,000,000; final = 16,000,000
        assertThat(result.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("4000000"));
        assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("16000000"));
        assertThat(result.getVoucherCode()).isEqualTo("SALE20");
        assertThat(voucher.getUsedQuantity()).isEqualTo(1);
    }

    @Test
    @DisplayName("Voucher PERCENT với maxDiscount: discount không được vượt quá giới hạn")
    void voucher_percentWithMaxDiscount_shouldCapDiscount() {
        // 50% của 20,000,000 = 10,000,000 nhưng max = 2,000,000
        Voucher voucher = buildVoucher("BIG50", DiscountType.PERCENT,
                new BigDecimal("50"), BigDecimal.ZERO, new BigDecimal("2000000"), 0);

        when(voucherRepository.findByCodeIgnoreCase("BIG50")).thenReturn(Optional.of(voucher));
        checkoutRequest.setVoucherCode("BIG50");

        var result = orderService.checkout(1L, checkoutRequest);

        assertThat(result.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("2000000"));
        assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("18000000"));
    }

    @Test
    @DisplayName("Voucher FIXED 5,000,000: giảm đúng số tiền cố định")
    void voucher_fixed_shouldDeductFixedAmount() {
        Voucher voucher = buildVoucher("FIXED5M", DiscountType.FIXED,
                new BigDecimal("5000000"), BigDecimal.ZERO, null, 0);

        when(voucherRepository.findByCodeIgnoreCase("FIXED5M")).thenReturn(Optional.of(voucher));
        checkoutRequest.setVoucherCode("FIXED5M");

        var result = orderService.checkout(1L, checkoutRequest);

        assertThat(result.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("5000000"));
        assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("15000000"));
    }

    // ─────────────────────────────────────────────
    // TEST: Voucher validation failures
    // ─────────────────────────────────────────────

    @Test
    @DisplayName("Voucher không tồn tại phải throw BadRequestException")
    void voucher_notFound_shouldThrow() {
        when(voucherRepository.findByCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        checkoutRequest.setVoucherCode("INVALID");

        assertThatThrownBy(() -> orderService.checkout(1L, checkoutRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không tồn tại");
    }

    @Test
    @DisplayName("Voucher đã hết hạn phải throw BadRequestException")
    void voucher_expired_shouldThrow() {
        Voucher voucher = buildVoucher("OLD", DiscountType.PERCENT,
                new BigDecimal("10"), BigDecimal.ZERO, null, 0);
        voucher.setStartDate(LocalDateTime.now().minusDays(10));
        voucher.setEndDate(LocalDateTime.now().minusDays(1)); // đã hết hạn

        when(voucherRepository.findByCodeIgnoreCase("OLD")).thenReturn(Optional.of(voucher));
        checkoutRequest.setVoucherCode("OLD");

        assertThatThrownBy(() -> orderService.checkout(1L, checkoutRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("hết hạn");
    }

    @Test
    @DisplayName("Voucher đã hết lượt sử dụng phải throw BadRequestException")
    void voucher_noRemainingUses_shouldThrow() {
        Voucher voucher = buildVoucher("FULL", DiscountType.PERCENT,
                new BigDecimal("10"), BigDecimal.ZERO, null, 100); // quantity=100, usedQuantity=100
        voucher.setUsedQuantity(100);

        when(voucherRepository.findByCodeIgnoreCase("FULL")).thenReturn(Optional.of(voucher));
        checkoutRequest.setVoucherCode("FULL");

        assertThatThrownBy(() -> orderService.checkout(1L, checkoutRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("hết lượt");
    }

    @Test
    @DisplayName("Đơn hàng không đạt giá trị tối thiểu phải throw BadRequestException")
    void voucher_orderBelowMinValue_shouldThrow() {
        // total = 20,000,000 nhưng minOrderValue = 50,000,000
        Voucher voucher = buildVoucher("BIGORDER", DiscountType.PERCENT,
                new BigDecimal("10"), new BigDecimal("50000000"), null, 0);

        when(voucherRepository.findByCodeIgnoreCase("BIGORDER")).thenReturn(Optional.of(voucher));
        checkoutRequest.setVoucherCode("BIGORDER");

        assertThatThrownBy(() -> orderService.checkout(1L, checkoutRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("giá trị tối thiểu");
    }

    @Test
    @DisplayName("Voucher bị vô hiệu hóa (active=false) phải throw BadRequestException")
    void voucher_inactive_shouldThrow() {
        Voucher voucher = buildVoucher("INACTIVE", DiscountType.PERCENT,
                new BigDecimal("10"), BigDecimal.ZERO, null, 0);
        voucher.setActive(false);

        when(voucherRepository.findByCodeIgnoreCase("INACTIVE")).thenReturn(Optional.of(voucher));
        checkoutRequest.setVoucherCode("INACTIVE");

        assertThatThrownBy(() -> orderService.checkout(1L, checkoutRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("vô hiệu hóa");
    }

    // ─────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────

    private Voucher buildVoucher(String code, DiscountType type, BigDecimal value,
                                  BigDecimal minOrder, BigDecimal maxDiscount, int quantity) {
        return Voucher.builder()
                .id(1L)
                .code(code)
                .discountType(type)
                .discountValue(value)
                .minOrderValue(minOrder)
                .maxDiscount(maxDiscount)
                .quantity(quantity)
                .usedQuantity(0)
                .active(true)
                .startDate(LocalDateTime.now().minusDays(1))
                .endDate(LocalDateTime.now().plusDays(30))
                .build();
    }
}
