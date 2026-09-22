package dh13c7.baitaplon;

import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Order;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.*;
import dh13c7.baitaplon.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService - customer order ownership")
class OrderOwnershipTest {

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

    @Test
    void getMyOrderById_deniesWhenOrderBelongsToAnotherUser() {
        User owner = User.builder().id(1L).username("userA").build();
        Order order = Order.builder().id(10L).user(owner).build();
        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.getMyOrderById(10L, 2L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }
}
