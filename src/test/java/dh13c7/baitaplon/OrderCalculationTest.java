package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.CheckoutPreviewRequest;
import dh13c7.baitaplon.dto.CheckoutPreviewResponse;
import dh13c7.baitaplon.dto.CheckoutRequest;
import dh13c7.baitaplon.dto.OrderDTO;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.*;
import dh13c7.baitaplon.service.DeliveryService;
import dh13c7.baitaplon.service.ShippingService;
import dh13c7.baitaplon.service.WarehouseSelectionService;
import dh13c7.baitaplon.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Phase 2 - Order Calculation and Checkout Integration Tests")
class OrderCalculationTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderItemRepository orderItemRepository;
    @Mock
    private CartRepository cartRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private VoucherRepository voucherRepository;
    @Mock
    private ShippingService shippingService;
    @Mock
    private DeliveryService deliveryService;
    @Mock
    private WarehouseSelectionService warehouseSelectionService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User testUser;
    private Product sonyA7;
    private Product lens;
    private Warehouse warehouse;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("customer1")
                .fullName("Nguyễn Văn A")
                .email("customer1@example.com")
                .build();

        // Sony A7 IV: Giá gốc 45.000.000, Giá khuyến mãi 42.990.000, Nặng 1.8kg, Kho 10
        sonyA7 = Product.builder()
                .id(101L)
                .name("Sony A7 IV")
                .price(BigDecimal.valueOf(45000000))
                .salePrice(BigDecimal.valueOf(42990000))
                .weightKg(BigDecimal.valueOf(1.8))
                .stock(10)
                .status(true)
                .build();

        // Lens: Giá gốc 8.500.000, Không có khuyến mãi, Nặng 1.2kg, Kho 5
        lens = Product.builder()
                .id(102L)
                .name("Sony FE 24-70mm F2.8 GM")
                .price(BigDecimal.valueOf(8500000))
                .salePrice(null)
                .weightKg(BigDecimal.valueOf(1.2))
                .stock(5)
                .status(true)
                .build();

        warehouse = Warehouse.builder()
                .id(1L)
                .warehouseCode("WH-HCM-01")
                .name("Kho Tổng TP.HCM")
                .status("ACTIVE")
                .latitude(10.7769)
                .longitude(106.7009)
                .build();
    }

    @Test
    @DisplayName("Test Section 26: Sony A7 IV (Sale 42.99M) + Lens (8.5M) + Voucher 10% (max 3M) + 8km STANDARD = 48.535.000đ")
    void checkoutPreview_section26OfficialExample_shouldMatchExactAmount() {
        // Setup cart
        Cart cart = new Cart();
        cart.setId(1L);
        cart.setUser(testUser);
        List<CartItem> items = new ArrayList<>();
        items.add(CartItem.builder().id(1L).cart(cart).product(sonyA7).quantity(1).build());
        items.add(CartItem.builder().id(2L).cart(cart).product(lens).quantity(1).build());
        cart.setItems(items);

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productRepository.findById(101L)).thenReturn(Optional.of(sonyA7));
        when(productRepository.findById(102L)).thenReturn(Optional.of(lens));

        // Voucher: 10%, max discount 3.000.000
        Voucher voucher = Voucher.builder()
                .id(1L)
                .code("DISCOUNT10")
                .discountType(DiscountType.PERCENT)
                .discountValue(BigDecimal.valueOf(10))
                .maxDiscount(BigDecimal.valueOf(3000000))
                .minOrderValue(BigDecimal.valueOf(1000000))
                .startDate(LocalDateTime.now().minusDays(1))
                .endDate(LocalDateTime.now().plusDays(10))
                .quantity(100)
                .usedQuantity(5)
                .active(true)
                .build();
        when(voucherRepository.findByCodeIgnoreCase("DISCOUNT10")).thenReturn(Optional.of(voucher));

        // Warehouse selection returns 8km distance
        when(warehouseSelectionService.selectWarehouseForOrder(any(), any()))
                .thenReturn(new WarehouseSelectionService.SelectionResult(warehouse, 8.0));

        // Shipping fee for STANDARD 8km and 3.0kg = 45.000 VND
        when(shippingService.calculateFee(eq(ShippingMethod.STANDARD), eq(BigDecimal.valueOf(51490000)), eq(BigDecimal.valueOf(3.0)), eq(8.0)))
                .thenReturn(BigDecimal.valueOf(45000));

        CheckoutPreviewRequest request = CheckoutPreviewRequest.builder()
                .shippingMethod(ShippingMethod.STANDARD)
                .voucherCode("DISCOUNT10")
                .customerLatitude(10.8231)
                .customerLongitude(106.6297)
                .build();

        CheckoutPreviewResponse response = orderService.calculateCheckoutPreview(1L, request);

        // Subtotal = 42.990.000 + 8.500.000 = 51.490.000
        assertThat(response.getSubtotal()).isEqualByComparingTo(BigDecimal.valueOf(51490000));

        // Discount = 10% of 51.49M is 5.149M, capped at 3.000.000
        assertThat(response.getDiscountAmount()).isEqualByComparingTo(BigDecimal.valueOf(3000000));

        // Shipping fee = 45.000
        assertThat(response.getShippingFee()).isEqualByComparingTo(BigDecimal.valueOf(45000));

        // Grand Total = 51.490.000 - 3.000.000 + 45.000 = 48.535.000
        assertThat(response.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(48535000));

        // Total weight = 1.8kg + 1.2kg = 3.0kg
        assertThat(response.getTotalWeightKg()).isEqualByComparingTo(BigDecimal.valueOf(3.0));
        assertThat(response.getDistanceKm()).isEqualTo(8.0);
        assertThat(response.getVoucherValid()).isTrue();
    }

    @Test
    @DisplayName("Stock validation: Ném lỗi 'Sản phẩm X không đủ số lượng trong kho.' khi thiếu hàng")
    void checkout_insufficientStock_shouldThrowBadRequestException() {
        sonyA7.setStock(2);

        Cart cart = new Cart();
        cart.setId(1L);
        cart.setUser(testUser);
        List<CartItem> items = new ArrayList<>();
        // Yêu cầu 5 sản phẩm nhưng kho chỉ còn 2
        items.add(CartItem.builder().id(1L).cart(cart).product(sonyA7).quantity(5).build());
        cart.setItems(items);

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productRepository.findById(101L)).thenReturn(Optional.of(sonyA7));

        CheckoutRequest request = new CheckoutRequest();
        request.setShippingAddress("123 Đường ABC");
        request.setPhone("0912345678");
        request.setPaymentMethod(PaymentMethod.COD);
        request.setShippingMethod(ShippingMethod.STANDARD);

        assertThatThrownBy(() -> orderService.checkout(1L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Sản phẩm 'Sony A7 IV' không đủ số lượng trong kho.");
    }
}
