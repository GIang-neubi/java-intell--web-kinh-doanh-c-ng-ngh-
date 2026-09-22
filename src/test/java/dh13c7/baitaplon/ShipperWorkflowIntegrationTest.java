package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.delivery.DeliveryDetailResponse;
import dh13c7.baitaplon.dto.delivery.DeliveryFailureRequest;
import dh13c7.baitaplon.dto.delivery.DeliveryOtpVerifyRequest;
import dh13c7.baitaplon.dto.delivery.DeliveryResponse;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Phase 3: Operational Shipper Workflow & Customer Tracking Comprehensive Test Suite")
public class ShipperWorkflowIntegrationTest {

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
    private User shipperA;
    private User shipperB;
    private User inactiveShipper;
    private User normalUser;
    private Warehouse warehouse;
    private Order order;
    private Delivery delivery;

    @BeforeEach
    void setUp() {
        customer = User.builder()
                .id(10L)
                .username("customer_hung")
                .fullName("Nguyễn Văn Hùng")
                .role(Role.ROLE_USER)
                .enabled(true)
                .build();

        shipperA = User.builder()
                .id(20L)
                .username("shipper_nam")
                .fullName("Trần Văn Nam")
                .role(Role.ROLE_SHIPPER)
                .enabled(true)
                .phone("0988111222")
                .build();

        shipperB = User.builder()
                .id(21L)
                .username("shipper_long")
                .fullName("Lê Hoàng Long")
                .role(Role.ROLE_SHIPPER)
                .enabled(true)
                .phone("0977333444")
                .build();

        inactiveShipper = User.builder()
                .id(22L)
                .username("shipper_locked")
                .fullName("Hoàng Văn Khóa")
                .role(Role.ROLE_SHIPPER)
                .enabled(false)
                .build();

        normalUser = User.builder()
                .id(30L)
                .username("user_thuong")
                .fullName("Phạm Văn Thường")
                .role(Role.ROLE_USER)
                .enabled(true)
                .build();

        warehouse = Warehouse.builder()
                .id(1L)
                .warehouseCode("WH-HN-01")
                .name("H&G Cầu Giấy")
                .address("123 Cầu Giấy, Hà Nội")
                .phone("0243888999")
                .latitude(21.0333)
                .longitude(105.7833)
                .status("ACTIVE")
                .build();

        order = Order.builder()
                .id(500L)
                .orderCode("HG-20260921-500")
                .user(customer)
                .shippingAddress("456 Nguyễn Trãi, Thanh Xuân, Hà Nội")
                .phone("0912345678")
                .totalAmount(new BigDecimal("48535000"))
                .subtotal(new BigDecimal("47000000"))
                .shippingFee(new BigDecimal("35000"))
                .status(OrderStatus.PENDING)
                .paymentMethod(PaymentMethod.COD)
                .paymentStatus("PENDING")
                .orderItems(new ArrayList<>())
                .build();

        delivery = Delivery.builder()
                .id(100L)
                .order(order)
                .warehouse(warehouse)
                .shippingMethod(ShippingMethod.STANDARD)
                .shippingFee(new BigDecimal("35000"))
                .status(DeliveryStatus.PENDING_ASSIGNMENT)
                .receiverName("Nguyễn Văn Hùng")
                .receiverPhone("0912345678")
                .deliveryAddress("456 Nguyễn Trãi, Thanh Xuân, Hà Nội")
                .totalWeightKg(new BigDecimal("2.140"))
                .distanceKm(8.0)
                .trackings(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("TEST 01: New order creates Delivery with status PENDING_ASSIGNMENT")
    void test01_NewOrderCreatesDelivery_PendingAssignment() {
        when(deliveryRepository.findByOrderId(order.getId())).thenReturn(Optional.empty());
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        Delivery result = deliveryService.createDeliveryForOrder(order, ShippingMethod.STANDARD, new BigDecimal("35000"), warehouse, 8.0, new BigDecimal("2.140"));

        assertNotNull(result);
        assertEquals(DeliveryStatus.PENDING_ASSIGNMENT, result.getStatus());
        assertEquals(warehouse, result.getWarehouse());
        assertEquals(8.0, result.getDistanceKm());
        assertEquals(new BigDecimal("2.140"), result.getTotalWeightKg());
        assertEquals(1, result.getTrackings().size());
        assertEquals(DeliveryStatus.PENDING_ASSIGNMENT, result.getTrackings().get(0).getStatus());
    }

    @Test
    @DisplayName("TEST 02: Admin assigns active shipper: status = ASSIGNED")
    void test02_AdminAssignsActiveShipper_Success() {
        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(userRepository.findById(20L)).thenReturn(Optional.of(shipperA));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.assignShipper(100L, 20L, "Phân công ca sáng");

        assertEquals(DeliveryStatus.ASSIGNED, res.getStatus());
        assertEquals(20L, res.getShipperId());
        assertNotNull(delivery.getAssignedAt());
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("TEST 03: Admin cannot assign normal USER (Throws BadRequestException)")
    void test03_AdminCannotAssignNormalUser() {
        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(userRepository.findById(30L)).thenReturn(Optional.of(normalUser));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                deliveryService.assignShipper(100L, 30L, "Gán sai role"));
        assertTrue(ex.getMessage().contains("ROLE_SHIPPER"));
    }

    @Test
    @DisplayName("TEST 04: Admin cannot assign inactive shipper (Throws BadRequestException)")
    void test04_AdminCannotAssignInactiveShipper() {
        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(userRepository.findById(22L)).thenReturn(Optional.of(inactiveShipper));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                deliveryService.assignShipper(100L, 22L, "Gán shipper bị khóa"));
        assertTrue(ex.getMessage().contains("khóa"));
    }

    @Test
    @DisplayName("TEST 05: Shipper A sees only assigned deliveries (backend enforces shipperId)")
    void test05_ShipperASeesOnlyAssignedDeliveries() {
        delivery.setShipper(shipperA);
        PageRequest pageRequest = PageRequest.of(0, 10);
        when(deliveryRepository.findByShipperId(20L, pageRequest))
                .thenReturn(new PageImpl<>(List.of(delivery), pageRequest, 1));

        PageResponse<DeliveryResponse> result = deliveryService.getMyShipperDeliveries(20L, null, 0, 10);

        assertEquals(1, result.getContent().size());
        assertEquals(20L, result.getContent().get(0).getShipperId());
    }

    @Test
    @DisplayName("TEST 06: Shipper accepts: ASSIGNED -> SHIPPER_ACCEPTED")
    void test06_ShipperAcceptsDelivery() {
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setShipper(shipperA);

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.shipperAcceptDelivery(100L, 20L);

        assertEquals(DeliveryStatus.SHIPPER_ACCEPTED, res.getStatus());
        assertNotNull(delivery.getAcceptedAt());
    }

    @Test
    @DisplayName("TEST 07: Shipper picks up: SHIPPER_ACCEPTED -> PICKED_UP (Order -> PROCESSING)")
    void test07_ShipperPicksUpPackage() {
        delivery.setStatus(DeliveryStatus.SHIPPER_ACCEPTED);
        delivery.setShipper(shipperA);

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.shipperPickupPackage(100L, 20L);

        assertEquals(DeliveryStatus.PICKED_UP, res.getStatus());
        assertNotNull(delivery.getPickedUpAt());
        assertEquals(OrderStatus.PROCESSING, order.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("TEST 08: Shipper starts delivery: PICKED_UP -> IN_TRANSIT (Order -> SHIPPING)")
    void test08_ShipperStartsDelivery() {
        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setShipper(shipperA);

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.shipperStartDelivery(100L, 20L, 21.0333, 105.7833);

        assertEquals(DeliveryStatus.IN_TRANSIT, res.getStatus());
        assertNotNull(delivery.getInTransitAt());
        assertEquals(OrderStatus.SHIPPING, order.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("TEST 09: Shipper arrives: IN_TRANSIT -> ARRIVED")
    void test09_ShipperArrives() {
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        delivery.setShipper(shipperA);

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryResponse res = deliveryService.shipperArrive(100L, 20L, 21.0333, 105.7833);

        assertEquals(DeliveryStatus.ARRIVED, res.getStatus());
        assertNotNull(delivery.getArrivedAt());
    }

    @Test
    @DisplayName("TEST 10: Shipper completes: ARRIVED -> DELIVERED (Order -> DELIVERED & COD PAID)")
    void test10_ShipperCompletesDelivery() {
        delivery.setStatus(DeliveryStatus.ARRIVED);
        delivery.setShipper(shipperA);

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryOtpVerifyRequest req = new DeliveryOtpVerifyRequest(null, "https://hg.com/proof.jpg", "Giao hàng thành công");
        DeliveryResponse res = deliveryService.shipperCompleteDelivery(100L, 20L, req);

        assertEquals(DeliveryStatus.DELIVERED, res.getStatus());
        assertNotNull(delivery.getDeliveredAt());
        assertEquals(OrderStatus.DELIVERED, order.getStatus());
        assertEquals("PAID", order.getPaymentStatus());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("TEST 11: Tracking timeline contains status changes with timestamps")
    void test11_TrackingTimelineContainsStatusChanges() {
        delivery.addTracking(DeliveryStatus.PENDING_ASSIGNMENT, "Tạo đơn", null, null);
        delivery.addTracking(DeliveryStatus.ASSIGNED, "Gán shipper Nam", null, null);
        delivery.addTracking(DeliveryStatus.PICKED_UP, "Lấy hàng", null, null);

        assertEquals(3, delivery.getTrackings().size());
        assertEquals(DeliveryStatus.PENDING_ASSIGNMENT, delivery.getTrackings().get(0).getStatus());
        assertEquals(DeliveryStatus.ASSIGNED, delivery.getTrackings().get(1).getStatus());
        assertEquals(DeliveryStatus.PICKED_UP, delivery.getTrackings().get(2).getStatus());
    }

    @Test
    @DisplayName("TEST 12: Customer sees only own delivery (IDOR protection throws ResourceNotFoundException)")
    void test12_CustomerSeesOnlyOwnDelivery() {
        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));

        assertThrows(ResourceNotFoundException.class, () ->
                deliveryService.getDeliveryDetailById(100L, 999L, false, false));
    }

    @Test
    @DisplayName("TEST 13: Customer cannot modify delivery status (confirm received rejected if not in transit/arrived)")
    void test13_CustomerCannotModifyDeliveryStatus_Arbitrarily() {
        delivery.setStatus(DeliveryStatus.PENDING_ASSIGNMENT);
        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));

        assertThrows(BadRequestException.class, () ->
                deliveryService.customerConfirmReceived(100L, 10L));
    }

    @Test
    @DisplayName("TEST 14: Shipper A cannot modify delivery assigned to Shipper B")
    void test14_ShipperCannotModifyAnotherShippersDelivery() {
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setShipper(shipperA); // Assigned to shipperA (id 20)

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));

        // ShipperB (id 21) tries to accept
        assertThrows(BadRequestException.class, () ->
                deliveryService.shipperAcceptDelivery(100L, 21L));
    }

    @Test
    @DisplayName("TEST 15: Invalid status transition rejected (e.g. PENDING_ASSIGNMENT -> DELIVERED)")
    void test15_InvalidStatusTransitionRejected() {
        delivery.setStatus(DeliveryStatus.PENDING_ASSIGNMENT);
        delivery.setShipper(shipperA);

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));

        assertThrows(BadRequestException.class, () ->
                deliveryService.shipperCompleteDelivery(100L, 20L, new DeliveryOtpVerifyRequest()));
    }

    @Test
    @DisplayName("TEST 16: Delivery failure creates tracking event with reason")
    void test16_DeliveryFailureCreatesTrackingEvent() {
        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        delivery.setShipper(shipperA);

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        DeliveryFailureRequest req = new DeliveryFailureRequest("Khách hàng không nghe máy", "Đã gọi 3 cuộc");
        DeliveryResponse res = deliveryService.shipperFailDelivery(100L, 20L, req);

        assertEquals(DeliveryStatus.DELIVERY_FAILED, res.getStatus());
        assertNotNull(delivery.getFailedAt());
        assertEquals("Khách hàng không nghe máy", delivery.getFailureReason());
        assertTrue(delivery.getTrackings().stream().anyMatch(t -> t.getStatus() == DeliveryStatus.DELIVERY_FAILED));
    }

    @Test
    @DisplayName("TEST 17: No duplicate tracking event on failed status update")
    void test17_NoDuplicateTrackingEventOnFailedStatusUpdate() {
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setShipper(shipperA);
        int initialTrackingCount = delivery.getTrackings().size();

        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));

        // Attempting pickup directly without accept should fail
        assertThrows(BadRequestException.class, () ->
                deliveryService.shipperPickupPackage(100L, 20L));

        assertEquals(initialTrackingCount, delivery.getTrackings().size());
    }

    @Test
    @DisplayName("TEST 18: Order status synchronizes correctly throughout delivery pipeline")
    void test18_OrderStatusSynchronizesCorrectly() {
        // Step 1: ASSIGNED -> Order CONFIRMED
        when(deliveryRepository.findById(100L)).thenReturn(Optional.of(delivery));
        when(userRepository.findById(20L)).thenReturn(Optional.of(shipperA));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));

        deliveryService.assignShipper(100L, 20L, null);
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());

        // Step 2: PICKED_UP -> Order PROCESSING
        delivery.setStatus(DeliveryStatus.SHIPPER_ACCEPTED);
        deliveryService.shipperPickupPackage(100L, 20L);
        assertEquals(OrderStatus.PROCESSING, order.getStatus());

        // Step 3: IN_TRANSIT -> Order SHIPPING
        deliveryService.shipperStartDelivery(100L, 20L, null, null);
        assertEquals(OrderStatus.SHIPPING, order.getStatus());

        // Step 4: DELIVERED -> Order DELIVERED
        delivery.setStatus(DeliveryStatus.ARRIVED);
        deliveryService.shipperCompleteDelivery(100L, 20L, null);
        assertEquals(OrderStatus.DELIVERED, order.getStatus());
    }
}
