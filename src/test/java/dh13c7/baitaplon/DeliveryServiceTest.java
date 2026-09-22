package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.delivery.DeliveryFailureRequest;
import dh13c7.baitaplon.dto.delivery.DeliveryOtpVerifyRequest;
import dh13c7.baitaplon.dto.delivery.DeliveryResponse;
import dh13c7.baitaplon.dto.delivery.DeliveryDetailResponse;
import dh13c7.baitaplon.dto.delivery.ReDeliverRequest;
import dh13c7.baitaplon.dto.delivery.ReturnWarehouseRequest;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.DeliveryRepository;
import dh13c7.baitaplon.repository.DeliveryTrackingRepository;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.repository.WarehouseRepository;
import dh13c7.baitaplon.service.impl.DeliveryServiceImpl;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DeliveryServiceTest {

    @Mock
    private DeliveryRepository deliveryRepository;

    @Mock
    private DeliveryTrackingRepository trackingRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @InjectMocks
    private DeliveryServiceImpl deliveryService;

    private User customer;
    private User shipper;
    private Order order;
    private Delivery delivery;

    @BeforeEach
    void setUp() {
        customer = User.builder()
                .id(1L)
                .username("customer1")
                .fullName("Khách hàng A")
                .role(Role.ROLE_USER)
                .enabled(true)
                .build();

        shipper = User.builder()
                .id(2L)
                .username("shipper1")
                .fullName("Shipper Nam")
                .role(Role.ROLE_SHIPPER)
                .enabled(true)
                .build();

        order = Order.builder()
                .id(100L)
                .orderCode("HG-20260921-001")
                .user(customer)
                .shippingAddress("123 Phố Huế, Hà Nội")
                .phone("0912345678")
                .totalAmount(new BigDecimal("1500000"))
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .paymentStatus("PENDING")
                .build();

        delivery = Delivery.builder()
                .id(10L)
                .order(order)
                .shippingMethod(ShippingMethod.STANDARD)
                .shippingFee(new BigDecimal("25000"))
                .status(DeliveryStatus.PENDING_ASSIGNMENT)
                .receiverName("Khách hàng A")
                .receiverPhone("0912345678")
                .deliveryAddress("123 Phố Huế, Hà Nội")
                .otpAttempts(0)
                .trackings(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Tạo delivery mới cho đơn hàng thành công")
    void testCreateDeliveryForOrder() {
        when(deliveryRepository.findByOrderId(100L)).thenReturn(Optional.empty());
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        Delivery result = deliveryService.createDeliveryForOrder(order, ShippingMethod.EXPRESS, new BigDecimal("45000"));

        assertNotNull(result);
        assertEquals(DeliveryStatus.PENDING_ASSIGNMENT, result.getStatus());
        assertEquals(ShippingMethod.EXPRESS, result.getShippingMethod());
        assertEquals(new BigDecimal("45000"), result.getShippingFee());
        assertFalse(result.getTrackings().isEmpty());
    }

    @Test
    @DisplayName("Tạo delivery trả về bản ghi cũ nếu đã tồn tại")
    void testCreateDeliveryForOrder_AlreadyExists() {
        when(deliveryRepository.findByOrderId(100L)).thenReturn(Optional.of(delivery));

        Delivery result = deliveryService.createDeliveryForOrder(order, ShippingMethod.STANDARD, new BigDecimal("25000"));

        assertNotNull(result);
        assertEquals(10L, result.getId());
        verify(deliveryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin gán Shipper thành công và chuyển trạng thái đơn hàng sang CONFIRMED")
    void testAssignShipper_Success() {
        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(userRepository.findById(2L)).thenReturn(Optional.of(shipper));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.assignShipper(10L, 2L, "Giao buổi chiều");

        assertNotNull(res);
        assertEquals(DeliveryStatus.ASSIGNED, res.getStatus());
        assertEquals(2L, res.getShipperId());
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("Gán người dùng không phải ROLE_SHIPPER ném BadRequestException")
    void testAssignShipper_InvalidRole() {
        User notShipper = User.builder()
                .id(3L)
                .username("user3")
                .role(Role.ROLE_USER)
                .enabled(true)
                .build();

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(userRepository.findById(3L)).thenReturn(Optional.of(notShipper));

        assertThrows(BadRequestException.class, () -> deliveryService.assignShipper(10L, 3L, null));
    }

    @Test
    @DisplayName("Shipper chấp nhận đơn hàng thành công")
    void testShipperAcceptDelivery_Success() {
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setShipper(shipper);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.shipperAcceptDelivery(10L, 2L);

        assertEquals(DeliveryStatus.SHIPPER_ACCEPTED, res.getStatus());
        assertNotNull(delivery.getAcceptedAt());
    }

    @Test
    @DisplayName("Shipper lấy hàng từ cửa hàng -> trạng thái PICKED_UP & Order PROCESSING")
    void testShipperPickupPackage_Success() {
        delivery.setStatus(DeliveryStatus.SHIPPER_ACCEPTED);
        delivery.setShipper(shipper);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.shipperPickupPackage(10L, 2L);

        assertEquals(DeliveryStatus.PICKED_UP, res.getStatus());
        assertEquals(OrderStatus.PROCESSING, order.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("Shipper bắt đầu giao -> trạng thái IN_TRANSIT & Order SHIPPING")
    void testShipperStartDelivery_Success() {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setShipper(shipper);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.shipperStartDelivery(10L, 2L, 21.0285, 105.8542);

        assertEquals(DeliveryStatus.IN_TRANSIT, res.getStatus());
        assertEquals(OrderStatus.SHIPPING, order.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("Shipper đến nơi -> chuyển trạng thái ARRIVED")
    void testShipperArrive_Success() {
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        delivery.setShipper(shipper);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.shipperArrive(10L, 2L, 21.0285, 105.8542);

        assertEquals(DeliveryStatus.ARRIVED, res.getStatus());
    }

    @Test
    @DisplayName("Shipper xác nhận giao hàng thành công -> DELIVERED & COD PAID")
    void testShipperCompleteDelivery_Success() {
        delivery.setStatus(DeliveryStatus.ARRIVED);
        delivery.setShipper(shipper);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryOtpVerifyRequest req = new DeliveryOtpVerifyRequest(null, "https://img.hg.com/proof.jpg", "Giao tận tay");
        DeliveryResponse res = deliveryService.shipperCompleteDelivery(10L, 2L, req);

        assertEquals(DeliveryStatus.DELIVERED, res.getStatus());
        assertEquals(OrderStatus.DELIVERED, order.getStatus());
        assertEquals("PAID", order.getPaymentStatus());
        assertEquals("https://img.hg.com/proof.jpg", delivery.getProofImage());
        assertNotNull(delivery.getDeliveredAt());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("Shipper cập nhật ảnh bằng chứng giao hàng (POD) thành công")
    void testUpdateProofImage_Success() {
        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setShipper(shipper);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.updateProofImage(10L, 2L, "https://cdn.hg.com/pod-12345.jpg");

        assertEquals("https://cdn.hg.com/pod-12345.jpg", res.getProofImage());
        assertEquals("https://cdn.hg.com/pod-12345.jpg", delivery.getProofImage());
        assertTrue(delivery.getTrackings().stream().anyMatch(t -> t.getNote().contains("ảnh bằng chứng")));
    }

    @Test
    @DisplayName("Shipper khác không thể cập nhật ảnh bằng chứng cho đơn của Shipper A")
    void testUpdateProofImage_DifferentShipper_ThrowsBadRequest() {
        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setShipper(shipper); // id = 2L

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        assertThrows(BadRequestException.class, () -> {
            deliveryService.updateProofImage(10L, 999L, "https://cdn.hg.com/hack.jpg");
        });
    }

    @Test
    @DisplayName("Shipper báo giao thất bại -> trạng thái DELIVERY_FAILED")
    void testShipperFailDelivery_Success() {
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        delivery.setShipper(shipper);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryFailureRequest req = new DeliveryFailureRequest("Không liên lạc được khách hàng", "Đã gọi 3 cuộc không nghe máy");
        DeliveryResponse res = deliveryService.shipperFailDelivery(10L, 2L, req);

        assertEquals(DeliveryStatus.DELIVERY_FAILED, res.getStatus());
        assertEquals("Không liên lạc được khách hàng", delivery.getFailureReason());
    }

    @Test
    @DisplayName("Khách hàng xác nhận nhận hàng thành công")
    void testCustomerConfirmReceived_Success() {
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.customerConfirmReceived(10L, 1L);

        assertEquals(DeliveryStatus.DELIVERED, res.getStatus());
        assertEquals(OrderStatus.DELIVERED, order.getStatus());
    }

    @Test
    @DisplayName("Kiểm tra bảo mật IDOR: Không cho phép người ngoài truy cập chi tiết vận chuyển")
    void testIdorProtection_UnauthorizedUserThrowsException() {
        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        assertThrows(ResourceNotFoundException.class, () ->
                deliveryService.getDeliveryDetailById(10L, 999L, false, false));
    }

    @Test
    @DisplayName("Bảo mật OTP: Chỉ khách hàng sở hữu đơn mới được thấy mã OTP, Shipper không thấy OTP")
    void testOtpVisibility_HiddenForShipper() {
        delivery.setStatus(DeliveryStatus.ARRIVED);
        delivery.setShipper(shipper);
        delivery.setConfirmationOtp("888999");

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        // Khách hàng xem -> có OTP
        DeliveryDetailResponse customerView = deliveryService.getDeliveryDetailById(10L, 1L, false, false);
        assertEquals("888999", customerView.getConfirmationOtp());

        // Shipper xem -> mã OTP bị ẩn (null)
        DeliveryDetailResponse shipperView = deliveryService.getDeliveryDetailById(10L, 2L, false, true);
        assertNull(shipperView.getConfirmationOtp());
    }

    @Test
    @DisplayName("Admin đối soát và xác nhận đã thu tiền COD của 1 đơn hàng thành công")
    void testSettleDeliveryCod_Success() {
        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setCodSettled(false);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.settleDeliveryCod(10L, "Thu tiền tại quầy H&G");

        assertTrue(Boolean.TRUE.equals(res.getCodSettled()));
        assertNotNull(res.getCodSettledAt());
        assertEquals("Thu tiền tại quầy H&G", res.getCodSettlementNote());
        verify(deliveryRepository, times(1)).save(delivery);
    }

    @Test
    @DisplayName("Admin đối soát COD thất bại nếu đơn chưa giao xong hoặc không phải COD")
    void testSettleDeliveryCod_BadRequest() {
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        assertThrows(BadRequestException.class, () ->
                deliveryService.settleDeliveryCod(10L, "Ghi chú"));
    }

    @Test
    @DisplayName("Admin đối soát toàn bộ tiền COD của một shipper thành công")
    void testSettleShipperCod_Success() {
        Delivery d1 = Delivery.builder()
                .id(101L)
                .order(order)
                .shipper(shipper)
                .status(DeliveryStatus.DELIVERED)
                .codSettled(false)
                .trackings(new ArrayList<>())
                .build();

        Delivery d2 = Delivery.builder()
                .id(102L)
                .order(order)
                .shipper(shipper)
                .status(DeliveryStatus.DELIVERED)
                .codSettled(true)
                .trackings(new ArrayList<>())
                .build();

        when(userRepository.findById(2L)).thenReturn(Optional.of(shipper));
        when(deliveryRepository.findDeliveredCodDeliveriesByShipper(2L)).thenReturn(List.of(d1, d2));
        when(deliveryRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        List<DeliveryResponse> settled = deliveryService.settleShipperCod(2L, "Quyết toán cuối ca");

        assertEquals(1, settled.size());
        assertTrue(Boolean.TRUE.equals(d1.getCodSettled()));
        assertNotNull(d1.getCodSettledAt());
        assertEquals("Quyết toán cuối ca", d1.getCodSettlementNote());
    }

    @Test
    @DisplayName("Admin lên lịch giao lại lần 2 cho đơn hàng giao thất bại thành công")
    void testReDeliver_Success() {
        delivery.setStatus(DeliveryStatus.DELIVERY_FAILED);
        delivery.setDeliveryAttempts(1);
        delivery.setConfirmationOtp("123456");
        delivery.setOtpAttempts(3);

        ReDeliverRequest req = ReDeliverRequest.builder()
                .shipperId(2L)
                .note("Khách hẹn giao lại vào buổi chiều")
                .build();

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(userRepository.findById(2L)).thenReturn(Optional.of(shipper));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.reDeliver(10L, req);

        assertEquals(DeliveryStatus.ASSIGNED, res.getStatus());
        assertEquals(2, res.getDeliveryAttempts());
        assertNull(delivery.getConfirmationOtp());
        assertEquals(0, delivery.getOtpAttempts());
        assertEquals("Khách hẹn giao lại vào buổi chiều", res.getReAttemptNote());
        verify(deliveryRepository, times(1)).save(delivery);
    }

    @Test
    @DisplayName("Admin lên lịch giao lại thất bại nếu đã vượt quá tối đa 3 lần giao")
    void testReDeliver_MaxAttemptsExceeded() {
        delivery.setStatus(DeliveryStatus.DELIVERY_FAILED);
        delivery.setDeliveryAttempts(3);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        assertThrows(BadRequestException.class, () ->
                deliveryService.reDeliver(10L, new ReDeliverRequest()));
    }

    @Test
    @DisplayName("Admin lên lịch giao lại thất bại nếu đơn không ở trạng thái DELIVERY_FAILED")
    void testReDeliver_BadRequest_NotFailedStatus() {
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        assertThrows(BadRequestException.class, () ->
                deliveryService.reDeliver(10L, new ReDeliverRequest()));
    }

    @Test
    @DisplayName("Admin hoàn hàng về kho H&G và tự động khôi phục số lượng tồn kho sản phẩm")
    void testReturnToWarehouse_Success_RestocksProduct() {
        delivery.setStatus(DeliveryStatus.DELIVERY_FAILED);

        Product product = Product.builder()
                .id(99L)
                .name("Camera IP Wi-Fi Ezviz")
                .stock(10)
                .build();

        OrderItem item = OrderItem.builder()
                .id(1L)
                .order(order)
                .product(product)
                .quantity(3)
                .price(BigDecimal.valueOf(500000))
                .build();

        order.setOrderItems(List.of(item));

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        ReturnWarehouseRequest req = ReturnWarehouseRequest.builder()
                .reason("Khách từ chối nhận hàng do đổi ý")
                .restock(true)
                .build();

        DeliveryResponse res = deliveryService.returnToWarehouse(10L, req);

        assertEquals(DeliveryStatus.CANCELLED, res.getStatus());
        assertTrue(Boolean.TRUE.equals(res.getReturnedToWarehouse()));
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        assertEquals(13, product.getStock()); // 10 + 3
        verify(productRepository, times(1)).save(product);
        verify(orderRepository, times(1)).save(order);
    }

    @Test
    @DisplayName("Phase 2-3: Shipper cập nhật tọa độ GPS thành công trong quá trình giao hàng")
    void testUpdateShipperLocation_Success() {
        delivery.setShipper(shipper);
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.updateShipperLocation(10L, 2L, 21.0333, 105.7833);

        assertEquals(21.0333, res.getCurrentLatitude());
        assertEquals(105.7833, res.getCurrentLongitude());
        assertNotNull(res.getLastLocationUpdate());
        verify(deliveryRepository, times(1)).save(delivery);
    }

    @Test
    @DisplayName("Phase 3: Bảo mật quyền riêng tư: Khách chỉ thấy tọa độ khi IN_TRANSIT, ẩn khi DELIVERED")
    void testCustomerPrivacy_CoordinatesHiddenAfterDelivered() {
        delivery.setCurrentLatitude(21.0333);
        delivery.setCurrentLongitude(105.7833);
        delivery.setLastLocationUpdate(java.time.LocalDateTime.now());

        // 1. Khi đang giao (IN_TRANSIT) -> Khách hàng nhìn thấy tọa độ
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        when(deliveryRepository.findByOrderId(100L)).thenReturn(Optional.of(delivery));
        DeliveryDetailResponse transitDetail = deliveryService.getDeliveryDetailByOrderId(100L, 1L, false);
        assertEquals(21.0333, transitDetail.getCurrentLatitude());
        assertEquals(105.7833, transitDetail.getCurrentLongitude());
        assertNotNull(transitDetail.getLastLocationUpdate());

        // 2. Khi đã giao xong (DELIVERED) -> Khách hàng KHÔNG còn thấy tọa độ trực tiếp (ẩn để bảo vệ quyền riêng tư)
        delivery.setStatus(DeliveryStatus.DELIVERED);
        DeliveryDetailResponse deliveredDetail = deliveryService.getDeliveryDetailByOrderId(100L, 1L, false);
        assertNull(deliveredDetail.getCurrentLatitude());
        assertNull(deliveredDetail.getCurrentLongitude());
        assertNull(deliveredDetail.getLastLocationUpdate());

        // 3. Nhưng Admin vẫn xem được lịch sử tọa độ
        DeliveryDetailResponse adminDetail = deliveryService.getDeliveryDetailByOrderId(100L, 999L, true);
        assertEquals(21.0333, adminDetail.getCurrentLatitude());
        assertEquals(105.7833, adminDetail.getCurrentLongitude());
    }
}
