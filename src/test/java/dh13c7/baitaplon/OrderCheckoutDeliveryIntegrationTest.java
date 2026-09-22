package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.CheckoutRequest;
import dh13c7.baitaplon.dto.OrderDTO;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.*;
import dh13c7.baitaplon.service.DeliveryService;
import dh13c7.baitaplon.service.ShippingService;
import dh13c7.baitaplon.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Phase 3: Order Checkout & Delivery Auto-Creation Integration Test")
public class OrderCheckoutDeliveryIntegrationTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private CartRepository cartRepository;
    @Mock private ProductRepository productRepository;
    @Mock private UserRepository userRepository;
    @Mock private VoucherRepository voucherRepository;
    @Mock private ShippingService shippingService;
    @Mock private DeliveryService deliveryService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User user;
    private Cart cart;
    private Product product;
    private CartItem cartItem;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).username("testuser").fullName("Test User").role(Role.ROLE_USER).enabled(true).build();

        product = Product.builder()
                .id(10L)
                .name("Sony Alpha A7 IV")
                .price(new BigDecimal("50000000"))
                .stock(5)
                .status(true)
                .build();

        cartItem = CartItem.builder().id(101L).product(product).quantity(1).build();

        cart = Cart.builder()
                .id(50L)
                .user(user)
                .items(new ArrayList<>(List.of(cartItem)))
                .build();
    }

    @Test
    @DisplayName("Đặt hàng thành công tự động tạo Delivery với đúng ShippingMethod và ShippingFee")
    void testCheckout_AutomaticallyCreatesDelivery() {
        CheckoutRequest request = new CheckoutRequest();
        request.setShippingAddress("Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội");
        request.setPhone("0912345678");
        request.setPaymentMethod(PaymentMethod.COD);
        request.setShippingMethod(ShippingMethod.EXPRESS);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(shippingService.getFeeForMethod(eq(ShippingMethod.EXPRESS), any())).thenReturn(new BigDecimal("45000"));

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(1001L);
            return o;
        });

        OrderDTO orderDTO = orderService.checkout(1L, request);

        assertNotNull(orderDTO);
        assertEquals(ShippingMethod.EXPRESS, orderDTO.getShippingMethod());
        assertEquals(new BigDecimal("45000"), orderDTO.getShippingFee());

        // Kiểm tra deliveryService.createDeliveryForOrder được gọi đúng tham số
        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        ArgumentCaptor<ShippingMethod> methodCaptor = ArgumentCaptor.forClass(ShippingMethod.class);
        ArgumentCaptor<BigDecimal> feeCaptor = ArgumentCaptor.forClass(BigDecimal.class);

        verify(deliveryService, times(1)).createDeliveryForOrder(
                orderCaptor.capture(),
                methodCaptor.capture(),
                feeCaptor.capture()
        );

        assertEquals(1001L, orderCaptor.getValue().getId());
        assertEquals(ShippingMethod.EXPRESS, methodCaptor.getValue());
        assertEquals(new BigDecimal("45000"), feeCaptor.getValue());
    }

    @Test
    @DisplayName("Hủy đơn hàng tự động gọi cancelDeliveryForOrder")
    void testCancelOrder_CancelsDelivery() {
        Order existingOrder = Order.builder()
                .id(1001L)
                .orderCode("HG-1001")
                .user(user)
                .status(OrderStatus.PENDING)
                .orderItems(new ArrayList<>(List.of(
                        OrderItem.builder().id(201L).product(product).quantity(1).price(product.getPrice()).build()
                )))
                .build();

        when(orderRepository.findById(1001L)).thenReturn(Optional.of(existingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        OrderDTO cancelled = orderService.updateOrderStatus(1001L, OrderStatus.CANCELLED);

        assertEquals(OrderStatus.CANCELLED, cancelled.getStatus());
        verify(deliveryService, times(1)).cancelDeliveryForOrder(eq(1001L), anyString());
    }
}
