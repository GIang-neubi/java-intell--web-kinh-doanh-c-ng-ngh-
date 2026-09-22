package dh13c7.baitaplon;

import dh13c7.baitaplon.Controller.AdminDeliveryController;
import dh13c7.baitaplon.Controller.DeliveryController;
import dh13c7.baitaplon.Controller.ShipperDeliveryController;
import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.delivery.*;
import dh13c7.baitaplon.model.DeliveryStatus;
import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.ShippingMethod;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.DeliveryService;
import dh13c7.baitaplon.service.FileStorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Phase 4: Delivery REST Controllers Unit Tests")
public class DeliveryControllersUnitTest {

    @Mock
    private DeliveryService deliveryService;

    @Mock
    private FileStorageService fileStorageService;

    private DeliveryController customerController;
    private AdminDeliveryController adminController;
    private ShipperDeliveryController shipperController;

    private UserDetailsImpl customerUser;
    private UserDetailsImpl adminUser;
    private UserDetailsImpl shipperUser;

    @BeforeEach
    void setUp() {
        customerController = new DeliveryController(deliveryService);
        adminController = new AdminDeliveryController(deliveryService);
        shipperController = new ShipperDeliveryController(deliveryService, fileStorageService);

        customerUser = new UserDetailsImpl(
                1L, "customer", "customer@hg.com", "pass", true,
                List.of(new SimpleGrantedAuthority(Role.ROLE_USER.name()))
        );

        adminUser = new UserDetailsImpl(
                2L, "admin", "admin@hg.com", "pass", true,
                List.of(new SimpleGrantedAuthority(Role.ROLE_ADMIN.name()))
        );

        shipperUser = new UserDetailsImpl(
                3L, "shipper1", "shipper1@hg.com", "pass", true,
                List.of(new SimpleGrantedAuthority(Role.ROLE_SHIPPER.name()))
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(UserDetailsImpl userDetails) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    // ================= CUSTOMER CONTROLLER =================

    @Test
    @DisplayName("Khách hàng lấy chi tiết vận chuyển theo orderId thành công")
    void testCustomer_GetDeliveryByOrderId() {
        authenticate(customerUser);

        DeliveryDetailResponse detail = DeliveryDetailResponse.builder()
                .id(10L)
                .orderId(100L)
                .status(DeliveryStatus.IN_TRANSIT)
                .confirmationOtp("123456")
                .build();

        when(deliveryService.getDeliveryDetailByOrderId(100L, 1L, false)).thenReturn(detail);

        ResponseEntity<ApiResponse<DeliveryDetailResponse>> res = customerController.getDeliveryByOrderId(100L);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertNotNull(res.getBody());
        assertTrue(res.getBody().isSuccess());
        assertEquals(10L, res.getBody().getData().getId());
        assertEquals("123456", res.getBody().getData().getConfirmationOtp());
    }

    @Test
    @DisplayName("Khách hàng xác nhận đã nhận hàng thành công")
    void testCustomer_ConfirmReceived() {
        authenticate(customerUser);

        DeliveryResponse deliveryRes = DeliveryResponse.builder()
                .id(10L)
                .status(DeliveryStatus.DELIVERED)
                .build();

        when(deliveryService.customerConfirmReceived(10L, 1L)).thenReturn(deliveryRes);

        ResponseEntity<ApiResponse<DeliveryResponse>> res = customerController.customerConfirmReceived(10L);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(DeliveryStatus.DELIVERED, res.getBody().getData().getStatus());
    }

    // ================= ADMIN CONTROLLER =================

    @Test
    @DisplayName("Admin tìm kiếm phân trang danh sách phiếu giao hàng")
    void testAdmin_SearchDeliveries() {
        PageResponse<DeliveryResponse> page = new PageResponse<>(
                List.of(DeliveryResponse.builder().id(1L).status(DeliveryStatus.PENDING_ASSIGNMENT).build()),
                0, 10, 1L, 1, true
        );

        when(deliveryService.searchDeliveries("HG", DeliveryStatus.PENDING_ASSIGNMENT, null, null, 0, 10))
                .thenReturn(page);

        ResponseEntity<ApiResponse<PageResponse<DeliveryResponse>>> res = adminController.searchDeliveries(
                "HG", DeliveryStatus.PENDING_ASSIGNMENT, null, null, 0, 10
        );

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().getData().getContent().size());
    }

    @Test
    @DisplayName("Admin phân công shipper cho phiếu giao hàng")
    void testAdmin_AssignShipper() {
        AssignShipperRequest req = new AssignShipperRequest(3L, "Giao buổi chiều");
        DeliveryResponse deliveryRes = DeliveryResponse.builder()
                .id(10L)
                .shipperId(3L)
                .status(DeliveryStatus.ASSIGNED)
                .build();

        when(deliveryService.assignShipper(10L, 3L, "Giao buổi chiều")).thenReturn(deliveryRes);

        ResponseEntity<ApiResponse<DeliveryResponse>> res = adminController.assignShipper(10L, req);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(DeliveryStatus.ASSIGNED, res.getBody().getData().getStatus());
    }

    @Test
    @DisplayName("Admin lấy thống kê tổng quan giao vận")
    void testAdmin_GetDeliveryStats() {
        DeliveryStatsResponse stats = DeliveryStatsResponse.builder()
                .total(100)
                .delivered(80)
                .activeShippers(5)
                .build();

        when(deliveryService.getDeliveryStats()).thenReturn(stats);

        ResponseEntity<ApiResponse<DeliveryStatsResponse>> res = adminController.getDeliveryStats();

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(100, res.getBody().getData().getTotal());
        assertEquals(80, res.getBody().getData().getDelivered());
    }

    // ================= SHIPPER CONTROLLER =================

    @Test
    @DisplayName("Shipper lấy danh sách đơn của mình")
    void testShipper_GetMyDeliveries() {
        authenticate(shipperUser);

        PageResponse<DeliveryResponse> page = new PageResponse<>(
                List.of(DeliveryResponse.builder().id(10L).status(DeliveryStatus.ASSIGNED).build()),
                0, 10, 1L, 1, true
        );

        when(deliveryService.getMyShipperDeliveries(3L, DeliveryStatus.ASSIGNED, 0, 10))
                .thenReturn(page);

        ResponseEntity<ApiResponse<PageResponse<DeliveryResponse>>> res = shipperController.getMyDeliveries(
                DeliveryStatus.ASSIGNED, 0, 10
        );

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().getData().getContent().size());
    }

    @Test
    @DisplayName("Shipper thực hiện chu trình giao hàng: Nhận đơn -> Lấy hàng -> Giao hàng -> Hoàn tất")
    void testShipper_DeliveryWorkflow() {
        authenticate(shipperUser);

        // 1. Nhận đơn
        when(deliveryService.shipperAcceptDelivery(10L, 3L))
                .thenReturn(DeliveryResponse.builder().id(10L).status(DeliveryStatus.SHIPPER_ACCEPTED).build());
        assertEquals(DeliveryStatus.SHIPPER_ACCEPTED, shipperController.acceptDelivery(10L).getBody().getData().getStatus());

        // 2. Lấy hàng
        when(deliveryService.shipperPickupPackage(10L, 3L))
                .thenReturn(DeliveryResponse.builder().id(10L).status(DeliveryStatus.PICKED_UP).build());
        assertEquals(DeliveryStatus.PICKED_UP, shipperController.pickupPackage(10L).getBody().getData().getStatus());

        // 3. Bắt đầu di chuyển
        when(deliveryService.shipperStartDelivery(10L, 3L, 21.02, 105.85))
                .thenReturn(DeliveryResponse.builder().id(10L).status(DeliveryStatus.IN_TRANSIT).build());
        assertEquals(DeliveryStatus.IN_TRANSIT,
                shipperController.startDelivery(10L, new DeliveryLocationRequest(21.02, 105.85)).getBody().getData().getStatus());

        // 4. Đến nơi
        when(deliveryService.shipperArrive(10L, 3L, 21.02, 105.85))
                .thenReturn(DeliveryResponse.builder().id(10L).status(DeliveryStatus.ARRIVED).build());
        assertEquals(DeliveryStatus.ARRIVED,
                shipperController.arriveAtDestination(10L, new DeliveryLocationRequest(21.02, 105.85)).getBody().getData().getStatus());

        // 5. Xác nhận OTP & hoàn tất
        DeliveryOtpVerifyRequest otpReq = new DeliveryOtpVerifyRequest("654321", "/uploads/proof.jpg", "Giao xong");
        when(deliveryService.shipperCompleteDelivery(10L, 3L, otpReq))
                .thenReturn(DeliveryResponse.builder().id(10L).status(DeliveryStatus.DELIVERED).build());
        assertEquals(DeliveryStatus.DELIVERED, shipperController.completeDelivery(10L, otpReq).getBody().getData().getStatus());
    }
}
