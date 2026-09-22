package dh13c7.baitaplon;

import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService - updateOrderStatus Unit Tests")
class OrderStatusTransitionTest {

    @Mock private OrderRepository orderRepository;
    @Mock private ProductRepository productRepository;

    // Các mock cần thiết để khởi tạo OrderServiceImpl (không dùng trong test này)
    @Mock private dh13c7.baitaplon.repository.OrderItemRepository orderItemRepository;
    @Mock private dh13c7.baitaplon.repository.CartRepository cartRepository;
    @Mock private dh13c7.baitaplon.repository.UserRepository userRepository;
    @Mock private dh13c7.baitaplon.repository.VoucherRepository voucherRepository;
    @Mock private dh13c7.baitaplon.service.ShippingService shippingService;
    @Mock private dh13c7.baitaplon.service.DeliveryService deliveryService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private Order pendingOrder;
    private Product product;
    private OrderItem orderItem;
    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).username("customer").email("c@hg.com")
                .password("pass").role(Role.ROLE_USER).enabled(true).build();

        product = Product.builder().id(10L).name("Canon R50")
                .price(new BigDecimal("15000000")).stock(5).status(true).build();

        orderItem = new OrderItem();
        orderItem.setId(1L);
        orderItem.setProduct(product);
        orderItem.setQuantity(2);
        orderItem.setPrice(new BigDecimal("15000000"));

        pendingOrder = Order.builder()
                .id(1L)
                .orderCode("ORD-TEST001")
                .user(user)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("30000000"))
                .shippingAddress("123 Đường Test")
                .phone("0912345678")
                .paymentMethod(PaymentMethod.COD)
                .paymentStatus("NOT_REQUIRED")
                .discountAmount(BigDecimal.ZERO)
                .orderItems(new ArrayList<>(List.of(orderItem)))
                .build();
    }

    // ─────────────────────────────────────────────
    // TEST: Chuyển trạng thái hợp lệ
    // ─────────────────────────────────────────────

    @Test
    @DisplayName("PENDING → CONFIRMED: chuyển trạng thái hợp lệ phải thành công")
    void transition_pendingToConfirmed_shouldSucceed() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = orderService.updateOrderStatus(1L, OrderStatus.CONFIRMED);

        assertThat(result.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verify(orderRepository).save(any(Order.class));
        // Không được hoàn kho vì không phải CANCEL
        verify(productRepository, never()).save(any());
    }

    @Test
    @DisplayName("PENDING → CANCELLED: phải hoàn lại stock vào sản phẩm")
    void transition_pendingToCancelled_shouldRestoreStock() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = orderService.updateOrderStatus(1L, OrderStatus.CANCELLED);

        assertThat(result.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        // Stock phải được hoàn lại: 5 + 2 = 7
        assertThat(product.getStock()).isEqualTo(7);
        verify(productRepository, times(1)).save(product);
    }

    // ─────────────────────────────────────────────
    // TEST: Chuyển trạng thái không hợp lệ
    // ─────────────────────────────────────────────

    @Test
    @DisplayName("PENDING → DELIVERED: bỏ qua các bước giữa phải throw BadRequestException")
    void transition_pendingToDelivered_invalidShouldThrow() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(pendingOrder));

        assertThatThrownBy(() -> orderService.updateOrderStatus(1L, OrderStatus.DELIVERED))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể chuyển trạng thái");

        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("DELIVERED → CANCELLED: đơn đã giao không thể hủy — phải throw BadRequestException")
    void transition_deliveredToCancelled_shouldThrow() {
        pendingOrder.setStatus(OrderStatus.DELIVERED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(pendingOrder));

        assertThatThrownBy(() -> orderService.updateOrderStatus(1L, OrderStatus.CANCELLED))
                .isInstanceOf(BadRequestException.class);

        // Stock không được thay đổi
        assertThat(product.getStock()).isEqualTo(5);
        verify(productRepository, never()).save(any());
    }

    @Test
    @DisplayName("CANCELLED → CONFIRMED: đơn đã hủy không thể chuyển tiếp — phải throw BadRequestException")
    void transition_cancelledToConfirmed_shouldThrow() {
        pendingOrder.setStatus(OrderStatus.CANCELLED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(pendingOrder));

        assertThatThrownBy(() -> orderService.updateOrderStatus(1L, OrderStatus.CONFIRMED))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể chuyển trạng thái");
    }

    @Test
    @DisplayName("Đơn hàng không tồn tại phải throw ResourceNotFoundException")
    void updateStatus_orderNotFound_shouldThrow() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.updateOrderStatus(999L, OrderStatus.CONFIRMED))
                .isInstanceOf(dh13c7.baitaplon.exception.ResourceNotFoundException.class);
    }
}
