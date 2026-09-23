package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.OrderItemDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.delivery.*;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.DeliveryRepository;
import dh13c7.baitaplon.repository.DeliveryTrackingRepository;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.repository.WarehouseRepository;
import dh13c7.baitaplon.service.DeliveryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryServiceImpl implements DeliveryService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final DeliveryRepository deliveryRepository;
    private final DeliveryTrackingRepository trackingRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private dh13c7.baitaplon.service.NotificationService notificationService;

    @Override
    @Transactional
    public Delivery createDeliveryForOrder(Order order, ShippingMethod method, BigDecimal fee) {
        return createDeliveryForOrder(order, method, fee, null, null, null);
    }

    @Override
    @Transactional
    public Delivery createDeliveryForOrder(Order order, ShippingMethod method, BigDecimal fee, Warehouse warehouse, Double distanceKm, BigDecimal totalWeightKg) {
        if (order == null || order.getId() == null) {
            throw new BadRequestException("Đơn hàng không hợp lệ để tạo phiếu vận chuyển");
        }

        // Tránh tạo duplicate nếu đã có
        var existing = deliveryRepository.findByOrderId(order.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        ShippingMethod shippingMethod = method != null ? method : ShippingMethod.STANDARD;
        BigDecimal shippingFee = fee != null ? fee : shippingMethod.getBaseFee();

        String receiverName = order.getUser() != null && order.getUser().getFullName() != null && !order.getUser().getFullName().isBlank()
                ? order.getUser().getFullName()
                : (order.getUser() != null ? order.getUser().getUsername() : "Khách hàng");

        // Tính tổng khối lượng từ các sản phẩm trong đơn hàng nếu chưa được truyền vào
        BigDecimal totalWeight = totalWeightKg;
        if (totalWeight == null && order.getOrderItems() != null) {
            totalWeight = BigDecimal.ZERO;
            for (var item : order.getOrderItems()) {
                if (item.getProduct() != null && item.getProduct().getWeightKg() != null) {
                    BigDecimal itemWeight = item.getProduct().getWeightKg().multiply(BigDecimal.valueOf(item.getQuantity()));
                    totalWeight = totalWeight.add(itemWeight);
                }
            }
        }
        if (totalWeight != null && totalWeight.compareTo(BigDecimal.ZERO) == 0) {
            totalWeight = null;
        }

        // Tự động gán kho hàng nếu chưa có: ưu tiên kho ACTIVE đầu tiên
        Warehouse assignedWarehouse = warehouse;
        if (assignedWarehouse == null && warehouseRepository != null) {
            assignedWarehouse = warehouseRepository.findByStatusOrderByNameAsc("ACTIVE")
                    .stream().findFirst().orElse(null);
            if (assignedWarehouse == null) {
                assignedWarehouse = warehouseRepository.findAll().stream().findFirst().orElse(null);
            }
        }

        Delivery delivery = Delivery.builder()
                .order(order)
                .warehouse(assignedWarehouse)
                .totalWeightKg(totalWeight)
                .distanceKm(distanceKm)
                .shippingMethod(shippingMethod)
                .shippingFee(shippingFee)
                .status(DeliveryStatus.PENDING_ASSIGNMENT)
                .estimatedDelivery(shippingMethod.getEstimatedTime())
                .receiverName(receiverName)
                .receiverPhone(order.getPhone())
                .deliveryAddress(order.getShippingAddress())
                .otpAttempts(0)
                .trackings(new ArrayList<>())
                .build();

        String warehouseInfo = assignedWarehouse != null ? " tại " + assignedWarehouse.getName() : "";
        delivery.addTracking(
                DeliveryStatus.PENDING_ASSIGNMENT,
                "Đơn hàng #" + order.getOrderCode() + " đã được tạo" + warehouseInfo + ". Chờ cửa hàng đóng gói và phân công shipper.",
                assignedWarehouse != null ? assignedWarehouse.getLatitude() : null,
                assignedWarehouse != null ? assignedWarehouse.getLongitude() : null
        );

        return deliveryRepository.save(delivery);
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryDetailResponse getDeliveryDetailByOrderId(Long orderId, Long currentUserId, boolean isAdmin) {
        Delivery delivery = deliveryRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin vận chuyển của đơn hàng"));

        // Bảo mật IDOR: Chỉ Admin hoặc chính chủ đơn hàng mới được xem
        if (!isAdmin && (delivery.getOrder().getUser() == null || !delivery.getOrder().getUser().getId().equals(currentUserId))) {
            throw new ResourceNotFoundException("Không tìm thấy thông tin vận chuyển của đơn hàng");
        }

        return mapToDetailResponse(delivery, !isAdmin, isAdmin, false);
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryDetailResponse getDeliveryDetailById(Long deliveryId, Long currentUserId, boolean isAdmin, boolean isShipper) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu giao hàng #" + deliveryId));

        boolean isOwner = delivery.getOrder().getUser() != null && delivery.getOrder().getUser().getId().equals(currentUserId);
        boolean isAssignedShipper = delivery.getShipper() != null && delivery.getShipper().getId().equals(currentUserId);

        if (!isAdmin && !isOwner && !isAssignedShipper) {
            throw new ResourceNotFoundException("Bạn không có quyền truy cập phiếu giao hàng này");
        }

        // Chỉ khách hàng sở hữu đơn mới được thấy mã OTP (shipper không được thấy)
        return mapToDetailResponse(delivery, isOwner, isAdmin, isAssignedShipper);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryTrackingDTO> getDeliveryTrackings(Long deliveryId, Long currentUserId, boolean isAdmin, boolean isShipper) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu giao hàng"));

        boolean isOwner = delivery.getOrder().getUser() != null && delivery.getOrder().getUser().getId().equals(currentUserId);
        boolean isAssignedShipper = delivery.getShipper() != null && delivery.getShipper().getId().equals(currentUserId);

        if (!isAdmin && !isOwner && !isAssignedShipper) {
            throw new ResourceNotFoundException("Bạn không có quyền truy cập thông tin lộ trình này");
        }

        return trackingRepository.findByDeliveryIdOrderByCreatedAtAsc(deliveryId)
                .stream().map(this::mapToTrackingDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DeliveryResponse> searchDeliveries(
            String keyword, DeliveryStatus status, Long shipperId, ShippingMethod shippingMethod, int pageNo, int pageSize) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        int safePage = Math.max(0, pageNo);
        int safeSize = pageSize > 0 ? Math.min(pageSize, 50) : 10;

        Page<Delivery> page = deliveryRepository.searchDeliveries(
                kw, status, shipperId, shippingMethod, PageRequest.of(safePage, safeSize));

        List<DeliveryResponse> content = page.getContent().stream()
                .map(this::mapToResponse).collect(Collectors.toList());

        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DeliveryResponse> getMyShipperDeliveries(Long shipperId, DeliveryStatus status, int pageNo, int pageSize) {
        int safePage = Math.max(0, pageNo);
        int safeSize = pageSize > 0 ? Math.min(pageSize, 50) : 10;

        Page<Delivery> page;
        if (status != null) {
            page = deliveryRepository.findByShipperIdAndStatus(shipperId, status, PageRequest.of(safePage, safeSize));
        } else {
            page = deliveryRepository.findByShipperId(shipperId, PageRequest.of(safePage, safeSize));
        }

        List<DeliveryResponse> content = page.getContent().stream()
                .map(this::mapToResponse).collect(Collectors.toList());

        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional
    public DeliveryResponse assignShipper(Long deliveryId, Long shipperId, String note) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu giao hàng"));

        User shipper = userRepository.findById(shipperId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản shipper"));

        if (shipper.getRole() != Role.ROLE_SHIPPER) {
            throw new BadRequestException("Tài khoản '" + shipper.getUsername() + "' không có vai trò Shipper (ROLE_SHIPPER)");
        }
        if (!shipper.isEnabled()) {
            throw new BadRequestException("Tài khoản shipper này đang bị khóa");
        }

        // Kiểm tra trạng thái hợp lệ để gán / đổi shipper
        Set<DeliveryStatus> assignable = Set.of(
                DeliveryStatus.PENDING_ASSIGNMENT,
                DeliveryStatus.ASSIGNED,
                DeliveryStatus.DELIVERY_FAILED
        );
        if (!assignable.contains(delivery.getStatus())) {
            throw new BadRequestException("Không thể gán shipper cho đơn đang ở trạng thái: " + delivery.getStatus().getDescription());
        }

        delivery.setShipper(shipper);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setAssignedAt(LocalDateTime.now());

        // Đồng bộ trạng thái Order nếu đang PENDING -> CONFIRMED
        Order order = delivery.getOrder();
        if (order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
        }

        String noteText = "Đã phân công đơn hàng cho shipper: " + (shipper.getFullName() != null ? shipper.getFullName() : shipper.getUsername());
        if (note != null && !note.isBlank()) {
            noteText += " (Ghi chú: " + note.trim() + ")";
        }
        delivery.addTracking(DeliveryStatus.ASSIGNED, noteText, null, null);
        Delivery savedDelivery = deliveryRepository.save(delivery);

        if (notificationService != null) {
            try {
                notificationService.sendNotification(
                        shipper.getId(),
                        "Phân công đơn hàng mới",
                        "Bạn được phân công giao đơn hàng #" + order.getOrderCode(),
                        "DELIVERY",
                        "/shipper/deliveries/" + savedDelivery.getId()
                );
            } catch (Exception e) {
                log.warn("Lỗi gửi thông báo phân công shipper: {}", e.getMessage());
            }
        }

        return mapToResponse(savedDelivery);
    }

    @Override
    @Transactional
    public DeliveryResponse shipperAcceptDelivery(Long deliveryId, Long shipperId) {
        Delivery delivery = getDeliveryForShipper(deliveryId, shipperId);

        if (delivery.getStatus() != DeliveryStatus.ASSIGNED) {
            throw new BadRequestException("Đơn hàng không ở trạng thái chờ nhận (Hiện tại: " + delivery.getStatus().getDescription() + ")");
        }

        delivery.setStatus(DeliveryStatus.SHIPPER_ACCEPTED);
        delivery.setAcceptedAt(LocalDateTime.now());
        delivery.addTracking(DeliveryStatus.SHIPPER_ACCEPTED, "Shipper đã nhận đơn và chuẩn bị tới lấy hàng.", null, null);

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional
    public DeliveryResponse shipperPickupPackage(Long deliveryId, Long shipperId) {
        Delivery delivery = getDeliveryForShipper(deliveryId, shipperId);

        if (delivery.getStatus() != DeliveryStatus.SHIPPER_ACCEPTED) {
            throw new BadRequestException("Bạn cần nhận đơn trước khi lấy hàng (Hiện tại: " + delivery.getStatus().getDescription() + ")");
        }

        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setPickedUpAt(LocalDateTime.now());

        // Đồng bộ trạng thái đơn hàng -> PROCESSING
        Order order = delivery.getOrder();
        if (order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.CONFIRMED) {
            order.setStatus(OrderStatus.PROCESSING);
            orderRepository.save(order);
        }

        String pickupSource = delivery.getWarehouse() != null
                ? "kho " + delivery.getWarehouse().getName()
                : "cửa hàng H&G";
        delivery.addTracking(DeliveryStatus.PICKED_UP, "Shipper đã nhận gói hàng từ " + pickupSource + ".", null, null);

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional
    public DeliveryResponse shipperStartDelivery(Long deliveryId, Long shipperId, Double lat, Double lng) {
        Delivery delivery = getDeliveryForShipper(deliveryId, shipperId);

        if (delivery.getStatus() != DeliveryStatus.PICKED_UP) {
            throw new BadRequestException("Bạn cần lấy hàng trước khi bắt đầu giao (Hiện tại: " + delivery.getStatus().getDescription() + ")");
        }

        delivery.setStatus(DeliveryStatus.IN_TRANSIT);
        delivery.setInTransitAt(LocalDateTime.now());
        delivery.setCurrentLatitude(lat);
        delivery.setCurrentLongitude(lng);
        if (lat != null && lng != null) {
            delivery.setLastLocationUpdate(LocalDateTime.now());
        }

        // Đồng bộ trạng thái đơn hàng -> SHIPPING
        Order order = delivery.getOrder();
        order.setStatus(OrderStatus.SHIPPING);
        orderRepository.save(order);

        delivery.addTracking(DeliveryStatus.IN_TRANSIT, "Shipper đang trên đường di chuyển giao tới địa chỉ của bạn.", lat, lng);
        Delivery savedDelivery = deliveryRepository.save(delivery);

        if (notificationService != null && order.getUser() != null) {
            try {
                notificationService.sendNotification(
                        order.getUser().getId(),
                        "Kiện hàng đang được giao",
                        "Tài xế đang trên đường giao đơn hàng #" + order.getOrderCode() + " đến bạn.",
                        "DELIVERY",
                        "/orders/" + order.getId()
                );
            } catch (Exception e) {
                log.warn("Lỗi gửi thông báo đơn hàng đang giao: {}", e.getMessage());
            }
        }

        return mapToResponse(savedDelivery);
    }

    @Override
    @Transactional
    public DeliveryResponse shipperArrive(Long deliveryId, Long shipperId, Double lat, Double lng) {
        Delivery delivery = getDeliveryForShipper(deliveryId, shipperId);

        if (delivery.getStatus() != DeliveryStatus.IN_TRANSIT) {
            throw new BadRequestException("Đơn hàng phải đang giao mới có thể báo đã đến (Hiện tại: " + delivery.getStatus().getDescription() + ")");
        }

        delivery.setStatus(DeliveryStatus.ARRIVED);
        delivery.setArrivedAt(LocalDateTime.now());
        delivery.setCurrentLatitude(lat);
        delivery.setCurrentLongitude(lng);
        if (lat != null && lng != null) {
            delivery.setLastLocationUpdate(LocalDateTime.now());
        }

        delivery.addTracking(
                DeliveryStatus.ARRIVED,
                "Shipper đã đến địa chỉ giao hàng, đang liên hệ khách nhận hàng.",
                lat, lng
        );

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional
    public DeliveryResponse updateShipperLocation(Long deliveryId, Long shipperId, Double lat, Double lng) {
        Delivery delivery = getDeliveryForShipper(deliveryId, shipperId);

        Set<DeliveryStatus> activeStatuses = Set.of(
                DeliveryStatus.SHIPPER_ACCEPTED,
                DeliveryStatus.PICKED_UP,
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.ARRIVED
        );

        if (!activeStatuses.contains(delivery.getStatus())) {
            throw new BadRequestException("Chỉ có thể cập nhật vị trí khi đơn đang trong tiến trình giao vận (Hiện tại: " + delivery.getStatus().getDescription() + ")");
        }

        if (lat == null || lng == null || lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
            throw new BadRequestException("Tọa độ GPS không hợp lệ");
        }

        delivery.setCurrentLatitude(lat);
        delivery.setCurrentLongitude(lng);
        delivery.setLastLocationUpdate(LocalDateTime.now());

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional
    public DeliveryResponse shipperCompleteDelivery(Long deliveryId, Long shipperId, DeliveryOtpVerifyRequest request) {
        Delivery delivery = getDeliveryForShipper(deliveryId, shipperId);

        // Cho phép hoàn tất từ IN_TRANSIT hoặc ARRIVED
        if (delivery.getStatus() != DeliveryStatus.IN_TRANSIT && delivery.getStatus() != DeliveryStatus.ARRIVED) {
            throw new BadRequestException("Chỉ có thể hoàn tất khi đơn đang giao hoặc đã đến nơi (Hiện tại: " + delivery.getStatus().getDescription() + ")");
        }

        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setDeliveredAt(LocalDateTime.now());
        if (request != null && request.getProofImage() != null && !request.getProofImage().isBlank()) {
            delivery.setProofImage(request.getProofImage().trim());
        }

        // Đồng bộ trạng thái đơn hàng -> DELIVERED & hoàn tất thanh toán COD nếu có
        Order order = delivery.getOrder();
        order.setStatus(OrderStatus.DELIVERED);
        if (order.getPaymentMethod() == PaymentMethod.COD) {
            order.setPaymentStatus("PAID");
        }
        orderRepository.save(order);

        String note = "Giao hàng thành công cho khách hàng.";
        if (request != null && request.getNote() != null && !request.getNote().isBlank()) {
            note += " Ghi chú: " + request.getNote().trim();
        }
        delivery.addTracking(DeliveryStatus.DELIVERED, note, null, null);
        Delivery savedDelivery = deliveryRepository.save(delivery);

        if (notificationService != null && order.getUser() != null) {
            try {
                notificationService.sendNotification(
                        order.getUser().getId(),
                        "Giao hàng thành công!",
                        "Đơn hàng #" + order.getOrderCode() + " đã được giao thành công.",
                        "DELIVERY",
                        "/orders/" + order.getId()
                );
            } catch (Exception e) {
                log.warn("Lỗi gửi thông báo giao hàng thành công: {}", e.getMessage());
            }
        }

        return mapToResponse(savedDelivery);
    }

    @Override
    @Transactional
    public DeliveryResponse shipperFailDelivery(Long deliveryId, Long shipperId, DeliveryFailureRequest request) {
        Delivery delivery = getDeliveryForShipper(deliveryId, shipperId);

        Set<DeliveryStatus> failAllowed = Set.of(
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.ARRIVED
        );
        if (!failAllowed.contains(delivery.getStatus())) {
            throw new BadRequestException("Không thể báo thất bại khi đơn đang ở trạng thái: " + delivery.getStatus().getDescription());
        }

        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Vui lòng cung cấp lý do giao hàng thất bại");
        }

        delivery.setStatus(DeliveryStatus.DELIVERY_FAILED);
        delivery.setFailedAt(LocalDateTime.now());
        delivery.setFailureReason(request.getReason().trim());
        delivery.setFailureNote(request.getNote() != null ? request.getNote().trim() : "");

        String note = "Giao hàng không thành công: " + request.getReason().trim();
        if (request.getNote() != null && !request.getNote().isBlank()) {
            note += " (" + request.getNote().trim() + ")";
        }
        delivery.addTracking(DeliveryStatus.DELIVERY_FAILED, note, null, null);
        Delivery savedDelivery = deliveryRepository.save(delivery);

        if (notificationService != null) {
            try {
                if (delivery.getOrder().getUser() != null) {
                    notificationService.sendNotification(
                            delivery.getOrder().getUser().getId(),
                            "Giao hàng không thành công",
                            "Đơn hàng #" + delivery.getOrder().getOrderCode() + " giao chưa thành công: " + request.getReason().trim(),
                            "DELIVERY",
                            "/orders/" + delivery.getOrder().getId()
                    );
                }
                notificationService.notifyAdmins(
                        "Giao hàng thất bại #" + delivery.getOrder().getOrderCode(),
                        "Đơn hàng #" + delivery.getOrder().getOrderCode() + " giao thất bại: " + request.getReason().trim(),
                        "DELIVERY",
                        "/admin/deliveries/" + delivery.getId()
                );
            } catch (Exception e) {
                log.warn("Lỗi gửi thông báo giao hàng thất bại: {}", e.getMessage());
            }
        }

        return mapToResponse(savedDelivery);
    }

    @Override
    @Transactional
    public DeliveryResponse customerConfirmReceived(Long deliveryId, Long customerId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu giao hàng"));

        if (delivery.getOrder().getUser() == null || !delivery.getOrder().getUser().getId().equals(customerId)) {
            throw new ResourceNotFoundException("Bạn không có quyền xác nhận đơn hàng này");
        }

        if (delivery.getStatus() == DeliveryStatus.DELIVERED) {
            return mapToResponse(delivery);
        }

        Set<DeliveryStatus> confirmable = Set.of(
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.ARRIVED
        );
        if (!confirmable.contains(delivery.getStatus())) {
            throw new BadRequestException("Đơn hàng chưa đến hoặc chưa bắt đầu giao.");
        }

        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setDeliveredAt(LocalDateTime.now());

        Order order = delivery.getOrder();
        order.setStatus(OrderStatus.DELIVERED);
        if (order.getPaymentMethod() == PaymentMethod.COD) {
            order.setPaymentStatus("PAID");
        }
        orderRepository.save(order);

        delivery.addTracking(DeliveryStatus.DELIVERED, "Khách hàng đã xác nhận đã nhận được hàng.", null, null);

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShipperSummaryDTO> getShipperSummaries() {
        List<User> shippers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_SHIPPER && u.isEnabled())
                .toList();

        List<ShipperSummaryDTO> summaries = new ArrayList<>();
        Set<DeliveryStatus> activeStatuses = Set.of(
                DeliveryStatus.ASSIGNED,
                DeliveryStatus.SHIPPER_ACCEPTED,
                DeliveryStatus.PICKED_UP,
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.ARRIVED
        );

        for (User s : shippers) {
            long activeCount = deliveryRepository.countByShipperIdAndStatusIn(s.getId(), activeStatuses);
            long doneCount = deliveryRepository.countByShipperIdAndStatusIn(s.getId(), Set.of(DeliveryStatus.DELIVERED));

            summaries.add(ShipperSummaryDTO.builder()
                    .id(s.getId())
                    .username(s.getUsername())
                    .fullName(s.getFullName() != null ? s.getFullName() : s.getUsername())
                    .phone(s.getPhone())
                    .email(s.getEmail())
                    .enabled(s.isEnabled())
                    .activeDeliveryCount(activeCount)
                    .completedDeliveryCount(doneCount)
                    .build());
        }

        return summaries;
    }

    @Override
    @Transactional
    public void cancelDeliveryForOrder(Long orderId, String reason) {
        deliveryRepository.findByOrderId(orderId).ifPresent(delivery -> {
            if (delivery.getStatus() != DeliveryStatus.DELIVERED && delivery.getStatus() != DeliveryStatus.CANCELLED) {
                delivery.setStatus(DeliveryStatus.CANCELLED);
                String note = "Đơn hàng đã bị hủy";
                if (reason != null && !reason.isBlank()) {
                    note += " (Lý do: " + reason.trim() + ")";
                }
                delivery.addTracking(DeliveryStatus.CANCELLED, note, null, null);
                deliveryRepository.save(delivery);
            }
        });
    }

    @Override
    @Transactional
    public DeliveryResponse updateProofImage(Long deliveryId, Long shipperId, String proofImage) {
        Delivery delivery = getDeliveryForShipper(deliveryId, shipperId);
        delivery.setProofImage(proofImage != null ? proofImage.trim() : null);
        delivery.addTracking(delivery.getStatus(), "Shipper đã cập nhật ảnh bằng chứng giao hàng.", null, null);
        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryStatsResponse getDeliveryStats() {
        long total = deliveryRepository.count();
        long pending = deliveryRepository.countByStatus(DeliveryStatus.PENDING_ASSIGNMENT);
        long assigned = deliveryRepository.countByStatus(DeliveryStatus.ASSIGNED)
                + deliveryRepository.countByStatus(DeliveryStatus.SHIPPER_ACCEPTED);
        long pickedUp = deliveryRepository.countByStatus(DeliveryStatus.PICKED_UP);
        long inTransit = deliveryRepository.countByStatus(DeliveryStatus.IN_TRANSIT);
        long arrived = deliveryRepository.countByStatus(DeliveryStatus.ARRIVED);
        long delivered = deliveryRepository.countByStatus(DeliveryStatus.DELIVERED);
        long failed = deliveryRepository.countByStatus(DeliveryStatus.DELIVERY_FAILED);
        long cancelled = deliveryRepository.countByStatus(DeliveryStatus.CANCELLED);

        long activeShippers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_SHIPPER && u.isEnabled())
                .count();

        return DeliveryStatsResponse.builder()
                .total(total)
                .pendingAssignment(pending)
                .assigned(assigned)
                .pickedUp(pickedUp)
                .inTransit(inTransit)
                .arrived(arrived)
                .delivered(delivered)
                .failed(failed)
                .cancelled(cancelled)
                .activeShippers(activeShippers)
                .build();
    }

    private Delivery getDeliveryForShipper(Long deliveryId, Long shipperId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu giao hàng #" + deliveryId));

        if (delivery.getShipper() == null || !delivery.getShipper().getId().equals(shipperId)) {
            throw new BadRequestException("Bạn không được phân công phụ trách đơn hàng này");
        }
        return delivery;
    }

    private DeliveryResponse mapToResponse(Delivery d) {
        if (d == null) return null;
        Order order = d.getOrder();
        User customer = order != null ? order.getUser() : null;
        User shipper = d.getShipper();

        String itemsSummary = "";
        if (order != null && order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            itemsSummary = order.getOrderItems().stream()
                    .map(it -> (it.getProduct() != null ? it.getProduct().getName() : "Sản phẩm") + " x" + it.getQuantity())
                    .collect(Collectors.joining(", "));
        }

        return DeliveryResponse.builder()
                .id(d.getId())
                .orderId(order != null ? order.getId() : null)
                .orderCode(order != null ? order.getOrderCode() : null)
                .customerId(customer != null ? customer.getId() : null)
                .customerName(customer != null ? (customer.getFullName() != null ? customer.getFullName() : customer.getUsername()) : null)
                .receiverName(d.getReceiverName())
                .receiverPhone(d.getReceiverPhone())
                .deliveryAddress(d.getDeliveryAddress())
                .shipperId(shipper != null ? shipper.getId() : null)
                .shipperName(shipper != null ? (shipper.getFullName() != null ? shipper.getFullName() : shipper.getUsername()) : null)
                .shipperPhone(shipper != null ? shipper.getPhone() : null)
                .warehouseId(d.getWarehouse() != null ? d.getWarehouse().getId() : null)
                .warehouseCode(d.getWarehouse() != null ? d.getWarehouse().getWarehouseCode() : null)
                .warehouseName(d.getWarehouse() != null ? d.getWarehouse().getName() : null)
                .warehouseAddress(d.getWarehouse() != null ? d.getWarehouse().getAddress() : null)
                .warehousePhone(d.getWarehouse() != null ? d.getWarehouse().getPhone() : null)
                .warehouseLatitude(d.getWarehouse() != null ? d.getWarehouse().getLatitude() : null)
                .warehouseLongitude(d.getWarehouse() != null ? d.getWarehouse().getLongitude() : null)
                .totalWeightKg(d.getTotalWeightKg())
                .distanceKm(d.getDistanceKm())
                .shippingMethod(d.getShippingMethod())
                .shippingMethodName(d.getShippingMethod() != null ? d.getShippingMethod().getDisplayName() : null)
                .shippingFee(d.getShippingFee())
                .orderTotalAmount(order != null ? order.getTotalAmount() : null)
                .itemsSummary(itemsSummary)
                .status(d.getStatus())
                .statusDescription(d.getStatus() != null ? d.getStatus().getDescription() : null)
                .estimatedDelivery(d.getEstimatedDelivery())
                .createdAt(d.getCreatedAt())
                .assignedAt(d.getAssignedAt())
                .acceptedAt(d.getAcceptedAt())
                .pickedUpAt(d.getPickedUpAt())
                .inTransitAt(d.getInTransitAt())
                .arrivedAt(d.getArrivedAt())
                .deliveredAt(d.getDeliveredAt())
                .failedAt(d.getFailedAt())
                .failureReason(d.getFailureReason())
                .proofImage(d.getProofImage())
                .currentLatitude(d.getCurrentLatitude())
                .currentLongitude(d.getCurrentLongitude())
                .lastLocationUpdate(d.getLastLocationUpdate())
                .codSettled(d.getCodSettled())
                .codSettledAt(d.getCodSettledAt())
                .codSettlementNote(d.getCodSettlementNote())
                .deliveryAttempts(d.getDeliveryAttempts())
                .nextDeliverySchedule(d.getNextDeliverySchedule())
                .reAttemptNote(d.getReAttemptNote())
                .returnedToWarehouse(d.getReturnedToWarehouse())
                .build();
    }

    private DeliveryDetailResponse mapToDetailResponse(Delivery d, boolean includeOtp, boolean isAdmin, boolean isShipper) {
        Order order = d.getOrder();
        User customer = order != null ? order.getUser() : null;
        User shipper = d.getShipper();

        // Bảo mật quyền riêng tư khách hàng (Customer Privacy):
        // Khách hàng chỉ được thấy vị trí GPS trực tiếp khi đơn hàng đang di chuyển giao (IN_TRANSIT hoặc ARRIVED).
        // Khi DELIVERED, DELIVERY_FAILED, CANCELLED hoặc PENDING -> ẩn tọa độ GPS thời gian thực.
        Double returnLat = d.getCurrentLatitude();
        Double returnLng = d.getCurrentLongitude();
        LocalDateTime returnLastUpdate = d.getLastLocationUpdate();

        boolean isMovingOrActive = d.getStatus() == DeliveryStatus.IN_TRANSIT || d.getStatus() == DeliveryStatus.ARRIVED;
        if (!isAdmin && !isShipper) {
            if (!isMovingOrActive) {
                returnLat = null;
                returnLng = null;
                returnLastUpdate = null;
            }
        }

        List<OrderItemDTO> items = order != null && order.getOrderItems() != null
                ? order.getOrderItems().stream().map(item -> new OrderItemDTO(
                        item.getId(),
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getProduct().getImage(),
                        item.getQuantity(),
                        item.getPrice(),
                        item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                )).collect(Collectors.toList())
                : List.of();

        List<DeliveryTrackingDTO> trackings = d.getTrackings() != null
                ? d.getTrackings().stream().map(this::mapToTrackingDTO).collect(Collectors.toList())
                : List.of();

        return DeliveryDetailResponse.builder()
                .id(d.getId())
                .orderId(order != null ? order.getId() : null)
                .orderCode(order != null ? order.getOrderCode() : null)
                .customerId(customer != null ? customer.getId() : null)
                .customerName(customer != null ? (customer.getFullName() != null ? customer.getFullName() : customer.getUsername()) : null)
                .receiverName(d.getReceiverName())
                .receiverPhone(d.getReceiverPhone())
                .deliveryAddress(d.getDeliveryAddress())
                .shipperId(shipper != null ? shipper.getId() : null)
                .shipperName(shipper != null ? (shipper.getFullName() != null ? shipper.getFullName() : shipper.getUsername()) : null)
                .shipperPhone(shipper != null ? shipper.getPhone() : null)
                .warehouseId(d.getWarehouse() != null ? d.getWarehouse().getId() : null)
                .warehouseCode(d.getWarehouse() != null ? d.getWarehouse().getWarehouseCode() : null)
                .warehouseName(d.getWarehouse() != null ? d.getWarehouse().getName() : null)
                .warehouseAddress(d.getWarehouse() != null ? d.getWarehouse().getAddress() : null)
                .warehousePhone(d.getWarehouse() != null ? d.getWarehouse().getPhone() : null)
                .warehouseLatitude(d.getWarehouse() != null ? d.getWarehouse().getLatitude() : null)
                .warehouseLongitude(d.getWarehouse() != null ? d.getWarehouse().getLongitude() : null)
                .totalWeightKg(d.getTotalWeightKg())
                .distanceKm(d.getDistanceKm())
                .shippingMethod(d.getShippingMethod())
                .shippingMethodName(d.getShippingMethod() != null ? d.getShippingMethod().getDisplayName() : null)
                .shippingFee(d.getShippingFee())
                .orderTotalAmount(order != null ? order.getTotalAmount() : null)
                .paymentMethod(order != null ? order.getPaymentMethod() : null)
                .paymentStatus(order != null ? order.getPaymentStatus() : null)
                .status(d.getStatus())
                .statusDescription(d.getStatus() != null ? d.getStatus().getDescription() : null)
                .estimatedDelivery(d.getEstimatedDelivery())
                .createdAt(d.getCreatedAt())
                .assignedAt(d.getAssignedAt())
                .acceptedAt(d.getAcceptedAt())
                .pickedUpAt(d.getPickedUpAt())
                .inTransitAt(d.getInTransitAt())
                .arrivedAt(d.getArrivedAt())
                .deliveredAt(d.getDeliveredAt())
                .failedAt(d.getFailedAt())
                .failureReason(d.getFailureReason())
                .failureNote(d.getFailureNote())
                .confirmationOtp(includeOtp ? d.getConfirmationOtp() : null)
                .proofImage(d.getProofImage())
                .currentLatitude(returnLat)
                .currentLongitude(returnLng)
                .lastLocationUpdate(returnLastUpdate)
                .codSettled(d.getCodSettled())
                .codSettledAt(d.getCodSettledAt())
                .codSettlementNote(d.getCodSettlementNote())
                .deliveryAttempts(d.getDeliveryAttempts())
                .nextDeliverySchedule(d.getNextDeliverySchedule())
                .reAttemptNote(d.getReAttemptNote())
                .returnedToWarehouse(d.getReturnedToWarehouse())
                .items(items)
                .trackings(trackings)
                .build();
    }

    private DeliveryTrackingDTO mapToTrackingDTO(DeliveryTracking t) {
        return DeliveryTrackingDTO.builder()
                .id(t.getId())
                .status(t.getStatus())
                .statusDescription(t.getStatus() != null ? t.getStatus().getDescription() : null)
                .note(t.getNote())
                .latitude(t.getLatitude())
                .longitude(t.getLongitude())
                .createdAt(t.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CodReconciliationResponse getCodReconciliation() {
        List<Delivery> deliveredCods = deliveryRepository.findAllDeliveredCodDeliveries();

        long totalOrders = deliveredCods.size();
        BigDecimal totalCollected = deliveredCods.stream()
                .map(d -> d.getOrder() != null && d.getOrder().getTotalAmount() != null ? d.getOrder().getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSettled = deliveredCods.stream()
                .filter(d -> Boolean.TRUE.equals(d.getCodSettled()))
                .map(d -> d.getOrder() != null && d.getOrder().getTotalAmount() != null ? d.getOrder().getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPending = totalCollected.subtract(totalSettled);

        List<User> shippers = userRepository.findByRole(Role.ROLE_SHIPPER);
        List<ShipperCodSummaryDTO> shipperSummaries = shippers.stream().map(s -> {
            List<Delivery> shipperDeliveries = deliveredCods.stream()
                    .filter(d -> d.getShipper() != null && d.getShipper().getId().equals(s.getId()))
                    .collect(Collectors.toList());

            long ordersCount = shipperDeliveries.size();
            BigDecimal collected = shipperDeliveries.stream()
                    .map(d -> d.getOrder() != null && d.getOrder().getTotalAmount() != null ? d.getOrder().getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal settled = shipperDeliveries.stream()
                    .filter(d -> Boolean.TRUE.equals(d.getCodSettled()))
                    .map(d -> d.getOrder() != null && d.getOrder().getTotalAmount() != null ? d.getOrder().getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal pending = collected.subtract(settled);
            long pendingOrders = shipperDeliveries.stream().filter(d -> !Boolean.TRUE.equals(d.getCodSettled())).count();
            long settledOrders = shipperDeliveries.stream().filter(d -> Boolean.TRUE.equals(d.getCodSettled())).count();

            return ShipperCodSummaryDTO.builder()
                    .shipperId(s.getId())
                    .shipperName(s.getFullName() != null ? s.getFullName() : s.getUsername())
                    .shipperPhone(s.getPhone())
                    .totalCodOrders(ordersCount)
                    .totalCodCollected(collected)
                    .totalCodSettled(settled)
                    .pendingCodAmount(pending)
                    .pendingCodOrders(pendingOrders)
                    .settledCodOrders(settledOrders)
                    .build();
        }).collect(Collectors.toList());

        return CodReconciliationResponse.builder()
                .totalDeliveredCodOrders(totalOrders)
                .totalCodCollected(totalCollected)
                .totalCodSettled(totalSettled)
                .totalCodPending(totalPending)
                .shipperSummaries(shipperSummaries)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ShipperCodSummaryDTO getShipperCodSummary(Long shipperId) {
        User shipper = userRepository.findById(shipperId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy shipper với ID: " + shipperId));

        List<Delivery> deliveries = deliveryRepository.findDeliveredCodDeliveriesByShipper(shipperId);

        long ordersCount = deliveries.size();
        BigDecimal collected = deliveries.stream()
                .map(d -> d.getOrder() != null && d.getOrder().getTotalAmount() != null ? d.getOrder().getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal settled = deliveries.stream()
                .filter(d -> Boolean.TRUE.equals(d.getCodSettled()))
                .map(d -> d.getOrder() != null && d.getOrder().getTotalAmount() != null ? d.getOrder().getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal pending = collected.subtract(settled);
        long pendingOrders = deliveries.stream().filter(d -> !Boolean.TRUE.equals(d.getCodSettled())).count();
        long settledOrders = deliveries.stream().filter(d -> Boolean.TRUE.equals(d.getCodSettled())).count();

        return ShipperCodSummaryDTO.builder()
                .shipperId(shipper.getId())
                .shipperName(shipper.getFullName() != null ? shipper.getFullName() : shipper.getUsername())
                .shipperPhone(shipper.getPhone())
                .totalCodOrders(ordersCount)
                .totalCodCollected(collected)
                .totalCodSettled(settled)
                .pendingCodAmount(pending)
                .pendingCodOrders(pendingOrders)
                .settledCodOrders(settledOrders)
                .build();
    }

    @Override
    @Transactional
    public DeliveryResponse settleDeliveryCod(Long deliveryId, String note) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu giao hàng với ID: " + deliveryId));

        if (delivery.getStatus() != DeliveryStatus.DELIVERED) {
            throw new BadRequestException("Chỉ có thể đối soát quyết toán tiền COD cho đơn hàng đã giao thành công");
        }
        if (delivery.getOrder() == null || delivery.getOrder().getPaymentMethod() != PaymentMethod.COD) {
            throw new BadRequestException("Đơn hàng này không sử dụng hình thức thu hộ COD");
        }

        delivery.setCodSettled(true);
        delivery.setCodSettledAt(LocalDateTime.now());
        String finalNote = (note != null && !note.isBlank()) ? note.trim() : "Admin xác nhận đã nhận đủ tiền mặt COD vào quỹ cửa hàng";
        delivery.setCodSettlementNote(finalNote);

        delivery.addTracking(DeliveryStatus.DELIVERED, "Admin đã đối soát và xác nhận nhận đủ tiền COD nộp về quỹ.", null, null);

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional
    public List<DeliveryResponse> settleShipperCod(Long shipperId, String note) {
        userRepository.findById(shipperId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy shipper với ID: " + shipperId));

        List<Delivery> pendingCods = deliveryRepository.findDeliveredCodDeliveriesByShipper(shipperId).stream()
                .filter(d -> !Boolean.TRUE.equals(d.getCodSettled()))
                .collect(Collectors.toList());

        LocalDateTime now = LocalDateTime.now();
        String finalNote = (note != null && !note.isBlank()) ? note.trim() : "Admin đối soát toàn bộ tiền mặt COD của Shipper";

        for (Delivery d : pendingCods) {
            d.setCodSettled(true);
            d.setCodSettledAt(now);
            d.setCodSettlementNote(finalNote);
            d.addTracking(DeliveryStatus.DELIVERED, "Admin đã đối soát và nhận đủ tiền mặt COD nộp vào quỹ.", null, null);
        }

        return deliveryRepository.saveAll(pendingCods).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public DeliveryResponse reDeliver(Long deliveryId, ReDeliverRequest request) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu giao hàng với ID: " + deliveryId));

        if (delivery.getStatus() != DeliveryStatus.DELIVERY_FAILED) {
            throw new BadRequestException("Chỉ có thể lên lịch giao lại cho đơn hàng ở trạng thái Giao hàng thất bại (DELIVERY_FAILED)");
        }

        int currentAttempts = delivery.getDeliveryAttempts() != null ? delivery.getDeliveryAttempts() : 1;
        if (currentAttempts >= 3) {
            throw new BadRequestException("Đơn hàng đã đạt giới hạn giao thất bại tối đa 3 lần. Vui lòng tiến hành hoàn hàng về kho.");
        }

        int newAttempts = currentAttempts + 1;
        delivery.setDeliveryAttempts(newAttempts);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setAssignedAt(LocalDateTime.now());
        delivery.setConfirmationOtp(null);
        delivery.setOtpAttempts(0);
        delivery.setArrivedAt(null);
        delivery.setInTransitAt(null);
        delivery.setDeliveredAt(null);
        delivery.setFailedAt(null);

        if (request != null) {
            if (request.getShipperId() != null) {
                User shipper = userRepository.findById(request.getShipperId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy shipper với ID: " + request.getShipperId()));
                if (shipper.getRole() != Role.ROLE_SHIPPER) {
                    throw new BadRequestException("Tài khoản '" + shipper.getUsername() + "' không có vai trò Shipper");
                }
                if (!shipper.isEnabled()) {
                    throw new BadRequestException("Tài khoản shipper này đang bị khóa");
                }
                delivery.setShipper(shipper);
            }
            delivery.setNextDeliverySchedule(request.getNextDeliverySchedule());
            delivery.setReAttemptNote(request.getNote() != null ? request.getNote().trim() : null);
        }

        // Đồng bộ đơn hàng sang CONFIRMED / SHIPPING nếu cần
        Order order = delivery.getOrder();
        if (order != null && order.getStatus() != OrderStatus.CONFIRMED && order.getStatus() != OrderStatus.SHIPPING) {
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
        }

        String trackingNote = "Admin điều phối giao lại lần " + newAttempts;
        if (delivery.getShipper() != null) {
            trackingNote += " cho shipper " + (delivery.getShipper().getFullName() != null ? delivery.getShipper().getFullName() : delivery.getShipper().getUsername());
        }
        if (delivery.getNextDeliverySchedule() != null) {
            trackingNote += " (Hẹn giao: " + delivery.getNextDeliverySchedule() + ")";
        }
        if (delivery.getReAttemptNote() != null && !delivery.getReAttemptNote().isBlank()) {
            trackingNote += " - Ghi chú: " + delivery.getReAttemptNote();
        }

        delivery.addTracking(DeliveryStatus.ASSIGNED, trackingNote, null, null);

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional
    public DeliveryResponse returnToWarehouse(Long deliveryId, ReturnWarehouseRequest request) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu giao hàng với ID: " + deliveryId));

        if (delivery.getStatus() != DeliveryStatus.DELIVERY_FAILED && delivery.getStatus() != DeliveryStatus.CANCELLED) {
            throw new BadRequestException("Chỉ có thể hoàn hàng về kho đối với đơn giao thất bại hoặc đã hủy");
        }

        delivery.setStatus(DeliveryStatus.CANCELLED);
        delivery.setReturnedToWarehouse(true);

        String reason = (request != null && request.getReason() != null && !request.getReason().isBlank())
                ? request.getReason().trim()
                : "Giao hàng thất bại nhiều lần / khách từ chối nhận";

        boolean restock = request == null || request.getRestock() == null || Boolean.TRUE.equals(request.getRestock());

        Order order = delivery.getOrder();
        if (order != null) {
            order.setStatus(OrderStatus.CANCELLED);
            if (restock && order.getOrderItems() != null) {
                for (OrderItem item : order.getOrderItems()) {
                    Product product = item.getProduct();
                    if (product != null) {
                        product.setStock(product.getStock() + item.getQuantity());
                        productRepository.save(product);
                    }
                }
            }
            orderRepository.save(order);
        }

        String trackingNote = "Hàng đã được chuyển hoàn về kho H&G (Lý do: " + reason + ")";
        if (restock) {
            trackingNote += " - Đã hoàn trả lại số lượng tồn kho sản phẩm.";
        }
        delivery.addTracking(DeliveryStatus.CANCELLED, trackingNote, null, null);

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    @Transactional(readOnly = true)
    public ShipperDeliveryStatsResponse getShipperStats(Long shipperId) {
        List<Delivery> deliveries = deliveryRepository.findByShipperIdOrderByCreatedAtDesc(shipperId);

        java.time.LocalDate today = java.time.LocalDate.now();
        long todayAssigned = deliveries.stream()
                .filter(d -> d.getAssignedAt() != null && d.getAssignedAt().toLocalDate().equals(today))
                .count();
        long accepted = deliveries.stream().filter(d -> d.getStatus() == DeliveryStatus.SHIPPER_ACCEPTED).count();
        long pickedUp = deliveries.stream().filter(d -> d.getStatus() == DeliveryStatus.PICKED_UP).count();
        long inTransit = deliveries.stream().filter(d -> d.getStatus() == DeliveryStatus.IN_TRANSIT).count();
        long arrived = deliveries.stream().filter(d -> d.getStatus() == DeliveryStatus.ARRIVED).count();
        long delivered = deliveries.stream().filter(d -> d.getStatus() == DeliveryStatus.DELIVERED).count();
        long failed = deliveries.stream().filter(d -> d.getStatus() == DeliveryStatus.DELIVERY_FAILED).count();

        return ShipperDeliveryStatsResponse.builder()
                .todayAssigned(todayAssigned)
                .accepted(accepted)
                .pickedUp(pickedUp)
                .inTransit(inTransit)
                .arrived(arrived)
                .delivered(delivered)
                .failed(failed)
                .totalAssigned(deliveries.size())
                .build();
    }
}

