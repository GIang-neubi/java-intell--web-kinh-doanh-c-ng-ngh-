package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.CheckoutPreviewRequest;
import dh13c7.baitaplon.dto.CheckoutPreviewResponse;
import dh13c7.baitaplon.dto.CheckoutRequest;
import dh13c7.baitaplon.dto.OrderDTO;
import dh13c7.baitaplon.dto.OrderItemDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.*;
import dh13c7.baitaplon.service.DeliveryService;
import dh13c7.baitaplon.service.OrderService;
import dh13c7.baitaplon.service.ShippingService;
import dh13c7.baitaplon.service.WarehouseSelectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final VoucherRepository voucherRepository;
    private final ShippingService shippingService;
    private final DeliveryService deliveryService;
    private final WarehouseSelectionService warehouseSelectionService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private dh13c7.baitaplon.service.NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public CheckoutPreviewResponse calculateCheckoutPreview(Long userId, CheckoutPreviewRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Giỏ hàng trống"));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new BadRequestException("Giỏ hàng trống");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalWeightKg = BigDecimal.ZERO;
        List<CheckoutPreviewResponse.CheckoutItemPreviewDTO> previewItems = new ArrayList<>();

        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();
            if (product == null) {
                throw new BadRequestException("Sản phẩm không tồn tại");
            }
            if (product.getId() != null && productRepository != null) {
                product = productRepository.findById(product.getId()).orElse(product);
            }

            boolean inStock = Boolean.TRUE.equals(product.getStatus()) && product.getStock() >= cartItem.getQuantity();
            BigDecimal unitPrice = product.getEffectivePrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            subtotal = subtotal.add(lineTotal);

            if (product.getWeightKg() != null) {
                totalWeightKg = totalWeightKg.add(product.getWeightKg().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
            }

            previewItems.add(CheckoutPreviewResponse.CheckoutItemPreviewDTO.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .image(product.getImage())
                    .quantity(cartItem.getQuantity())
                    .unitPrice(unitPrice)
                    .lineTotal(lineTotal)
                    .weightKg(product.getWeightKg())
                    .availableStock(product.getStock())
                    .inStock(inStock)
                    .build());
        }

        // 1. Voucher validation (Áp dụng chỉ trên subtotal)
        BigDecimal discountAmount = BigDecimal.ZERO;
        Boolean voucherValid = null;
        String voucherMessage = null;

        if (request != null && request.getVoucherCode() != null && !request.getVoucherCode().isBlank()) {
            String code = request.getVoucherCode().trim().toUpperCase();
            var voucherOpt = voucherRepository.findByCodeIgnoreCase(code);
            if (voucherOpt.isEmpty()) {
                voucherValid = false;
                voucherMessage = "Mã giảm giá \"" + code + "\" không tồn tại";
            } else {
                Voucher voucher = voucherOpt.get();
                LocalDateTime now = LocalDateTime.now();
                if (!Boolean.TRUE.equals(voucher.getActive())) {
                    voucherValid = false;
                    voucherMessage = "Mã giảm giá đã bị vô hiệu hóa";
                } else if (now.isBefore(voucher.getStartDate())) {
                    voucherValid = false;
                    voucherMessage = "Mã giảm giá chưa đến thời gian áp dụng";
                } else if (now.isAfter(voucher.getEndDate())) {
                    voucherValid = false;
                    voucherMessage = "Mã giảm giá đã hết hạn";
                } else if (voucher.getQuantity() > 0 && voucher.getUsedQuantity() >= voucher.getQuantity()) {
                    voucherValid = false;
                    voucherMessage = "Mã giảm giá đã hết lượt sử dụng";
                } else if (subtotal.compareTo(voucher.getMinOrderValue()) < 0) {
                    voucherValid = false;
                    voucherMessage = "Đơn hàng chưa đạt giá trị tối thiểu " + voucher.getMinOrderValue() + "đ";
                } else {
                    voucherValid = true;
                    voucherMessage = "Áp dụng mã giảm giá thành công";
                    if (voucher.getDiscountType() == DiscountType.PERCENT) {
                        discountAmount = subtotal.multiply(voucher.getDiscountValue())
                                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                        if (voucher.getMaxDiscount() != null && discountAmount.compareTo(voucher.getMaxDiscount()) > 0) {
                            discountAmount = voucher.getMaxDiscount();
                        }
                    } else {
                        discountAmount = voucher.getDiscountValue().min(subtotal);
                    }
                    discountAmount = discountAmount.min(subtotal);
                }
            }
        }

        // 2. Lựa chọn kho hàng xác định & tính khoảng cách
        Warehouse selectedWarehouse = null;
        Double distanceKm = null;
        if (warehouseSelectionService != null) {
            Double custLat = request != null ? request.getCustomerLatitude() : null;
            Double custLng = request != null ? request.getCustomerLongitude() : null;
            var selection = warehouseSelectionService.selectWarehouseForOrder(custLat, custLng);
            if (selection != null) {
                selectedWarehouse = selection.warehouse();
                distanceKm = selection.distanceKm();
            }
        }

        // 3. Phương thức vận chuyển & tính phí ship
        ShippingMethod shippingMethod = (request != null && request.getShippingMethod() != null)
                ? request.getShippingMethod()
                : ShippingMethod.STANDARD;

        BigDecimal shippingFee = null;
        if (shippingService != null) {
            shippingFee = shippingService.calculateFee(shippingMethod, subtotal, totalWeightKg, distanceKm);
            if (shippingFee == null) {
                shippingFee = shippingService.getFeeForMethod(shippingMethod, subtotal);
            }
        }
        if (shippingFee == null) {
            shippingFee = shippingMethod.getBaseFee();
        }

        // 4. Tổng thanh toán: Subtotal - Discount + ShippingFee
        BigDecimal grandTotal = subtotal.subtract(discountAmount).max(BigDecimal.ZERO).add(shippingFee);

        return CheckoutPreviewResponse.builder()
                .subtotal(subtotal)
                .discountAmount(discountAmount)
                .shippingFee(shippingFee)
                .totalAmount(grandTotal)
                .shippingMethod(shippingMethod)
                .shippingMethodName(shippingMethod.getDisplayName())
                .estimatedDelivery(shippingMethod.getEstimatedTime())
                .totalWeightKg(totalWeightKg)
                .distanceKm(distanceKm)
                .warehouseId(selectedWarehouse != null ? selectedWarehouse.getId() : null)
                .warehouseCode(selectedWarehouse != null ? selectedWarehouse.getWarehouseCode() : null)
                .warehouseName(selectedWarehouse != null ? selectedWarehouse.getName() : null)
                .voucherValid(voucherValid)
                .voucherMessage(voucherMessage)
                .items(previewItems)
                .build();
    }

    @Override
    @Transactional
    public OrderDTO checkout(Long userId, CheckoutRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Giỏ hàng trống"));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new BadRequestException("Giỏ hàng trống");
        }

        // 1. Tạo đơn hàng Order
        Order order = new Order();
        order.setUser(user);
        order.setOrderCode("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setShippingAddress(request.getShippingAddress());
        order.setPhone(request.getPhone());
        order.setPaymentMethod(request.getPaymentMethod());
        order.setStatus(OrderStatus.PENDING);
        order.setOrderItems(new ArrayList<>());

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalWeightKg = BigDecimal.ZERO;

        // 2. Kiểm tra tồn kho, trừ kho và tạo OrderItem với giá hiệu lực EffectiveUnitPrice
        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();
            if (product == null) {
                throw new BadRequestException("Sản phẩm không tồn tại");
            }
            if (product.getId() != null && productRepository != null) {
                product = productRepository.findById(product.getId()).orElse(product);
            }

            // Kiểm tra trạng thái kinh doanh
            if (!Boolean.TRUE.equals(product.getStatus())) {
                throw new BadRequestException("Sản phẩm '" + product.getName() + "' đã ngừng kinh doanh");
            }

            // Kiểm tra tồn kho (Section 18)
            if (cartItem.getQuantity() > product.getStock()) {
                throw new BadRequestException("Sản phẩm '" + product.getName() + "' không đủ số lượng trong kho.");
            }

            // Trừ tồn kho
            product.setStock(product.getStock() - cartItem.getQuantity());
            productRepository.save(product);

            // Đơn giá có hiệu lực tại thời điểm đặt hàng
            BigDecimal itemPrice = product.getEffectivePrice();
            BigDecimal lineTotal = itemPrice.multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            subtotal = subtotal.add(lineTotal);

            if (product.getWeightKg() != null) {
                totalWeightKg = totalWeightKg.add(product.getWeightKg().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPrice(itemPrice);

            order.getOrderItems().add(orderItem);
        }

        order.setSubtotal(subtotal);

        // 3. Áp dụng voucher nếu có (Chỉ giảm trên Subtotal)
        BigDecimal discountAmount = BigDecimal.ZERO;
        String appliedVoucherCode = null;
        if (request.getVoucherCode() != null && !request.getVoucherCode().isBlank()) {
            String code = request.getVoucherCode().trim().toUpperCase();
            Voucher voucher = voucherRepository.findByCodeIgnoreCase(code)
                    .orElseThrow(() -> new BadRequestException("Mã giảm giá \"" + code + "\" không tồn tại"));

            if (!Boolean.TRUE.equals(voucher.getActive())) throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
            LocalDateTime now = LocalDateTime.now();
            if (now.isBefore(voucher.getStartDate())) throw new BadRequestException("Mã giảm giá chưa đến thời gian sử dụng");
            if (now.isAfter(voucher.getEndDate())) throw new BadRequestException("Mã giảm giá đã hết hạn");
            if (voucher.getQuantity() > 0 && voucher.getUsedQuantity() >= voucher.getQuantity())
                throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
            if (subtotal.compareTo(voucher.getMinOrderValue()) < 0)
                throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu " +
                        voucher.getMinOrderValue() + "đ để dùng mã này");

            if (voucher.getDiscountType() == DiscountType.PERCENT) {
                discountAmount = subtotal.multiply(voucher.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                if (voucher.getMaxDiscount() != null && discountAmount.compareTo(voucher.getMaxDiscount()) > 0)
                    discountAmount = voucher.getMaxDiscount();
            } else {
                discountAmount = voucher.getDiscountValue().min(subtotal);
            }
            discountAmount = discountAmount.min(subtotal);

            // Tăng lượt sử dụng voucher
            voucher.setUsedQuantity(voucher.getUsedQuantity() + 1);
            voucherRepository.save(voucher);
            appliedVoucherCode = voucher.getCode();
        }

        // 4. Lựa chọn kho hàng xác định & tính khoảng cách
        Warehouse selectedWarehouse = null;
        Double distanceKm = null;
        if (warehouseSelectionService != null) {
            Double custLat = request.getCustomerLatitude();
            Double custLng = request.getCustomerLongitude();
            var selection = warehouseSelectionService.selectWarehouseForOrder(custLat, custLng);
            if (selection != null) {
                selectedWarehouse = selection.warehouse();
                distanceKm = selection.distanceKm();
            }
        }

        // 5. Tính phí vận chuyển theo công thức chuẩn Phase 2
        ShippingMethod shippingMethod = request.getShippingMethod() != null
                ? request.getShippingMethod()
                : ShippingMethod.STANDARD;
        BigDecimal shippingFee = null;
        if (shippingService != null) {
            shippingFee = shippingService.calculateFee(shippingMethod, subtotal, totalWeightKg, distanceKm);
            if (shippingFee == null) {
                shippingFee = shippingService.getFeeForMethod(shippingMethod, subtotal);
            }
        }
        if (shippingFee == null) {
            shippingFee = shippingMethod.getBaseFee();
        }

        // 6. Tính tổng tiền thanh toán GrandTotal = Subtotal - Discount + ShippingFee
        BigDecimal totalAmount = subtotal.subtract(discountAmount).max(BigDecimal.ZERO).add(shippingFee);

        // 7. Lưu snapshot tài chính toàn vẹn
        order.setShippingMethod(shippingMethod);
        order.setShippingFee(shippingFee);
        order.setDiscountAmount(discountAmount);
        order.setVoucherCode(appliedVoucherCode);
        order.setTotalAmount(totalAmount);

        if (request.getPaymentMethod() == PaymentMethod.BANKING) {
            order.setPaymentStatus("PENDING");
            order.setTransferContent("HG " + order.getOrderCode());
        } else {
            order.setPaymentStatus("NOT_REQUIRED");
        }
        Order savedOrder = orderRepository.save(order);

        // 8. Tự động khởi tạo phiếu giao hàng Delivery
        try {
            deliveryService.createDeliveryForOrder(savedOrder, shippingMethod, shippingFee);
        } catch (Exception e) {
            log.error("Lỗi khi tự động tạo phiếu giao hàng cho đơn hàng #" + savedOrder.getId(), e);
        }

        // 9. Xoá giỏ hàng sau khi đặt thành công
        cart.getItems().clear();
        cartRepository.save(cart);

        // 10. Gửi thông báo đặt hàng cho khách hàng và quản trị viên
        if (notificationService != null) {
            try {
                notificationService.sendNotification(
                        user.getId(),
                        "Đặt hàng thành công!",
                        "Đơn hàng #" + savedOrder.getOrderCode() + " đã được tạo thành công. H&G Store đang chuẩn bị đơn hàng cho bạn.",
                        "ORDER",
                        "/orders/" + savedOrder.getId()
                );
                notificationService.notifyAdmins(
                        "Đơn hàng mới #" + savedOrder.getOrderCode(),
                        "Khách hàng " + (user.getFullName() != null ? user.getFullName() : user.getUsername()) + " vừa đặt đơn hàng #" + savedOrder.getOrderCode(),
                        "ORDER",
                        "/admin/orders/" + savedOrder.getId()
                );
            } catch (Exception e) {
                log.warn("Không thể gửi thông báo đặt hàng: {}", e.getMessage());
            }
        }

        return mapToDTO(savedOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getMyOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDTO getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
        return mapToDTO(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDTO getMyOrderById(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
        if (!order.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng");
        }
        return mapToDTO(order);
    }

    // Valid transitions: PENDING→CONFIRMED, CONFIRMED→PROCESSING, PROCESSING→SHIPPING,
    //                    SHIPPING→DELIVERED, any→CANCELLED (except already DELIVERED)
    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
        OrderStatus.PENDING,    Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
        OrderStatus.CONFIRMED,  Set.of(OrderStatus.PROCESSING, OrderStatus.CANCELLED),
        OrderStatus.PROCESSING, Set.of(OrderStatus.SHIPPING, OrderStatus.CANCELLED),
        OrderStatus.SHIPPING,   Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
        OrderStatus.DELIVERED,  Set.of(),
        OrderStatus.CANCELLED,  Set.of()
    );

    @Override
    @Transactional
    public OrderDTO updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        OrderStatus current = order.getStatus();
        Set<OrderStatus> allowed = TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowed.contains(newStatus)) {
            throw new BadRequestException(
                "Không thể chuyển trạng thái từ " + current.name() + " sang " + newStatus.name()
                + ". Các chuyển đổi hợp lệ: " + allowed);
        }

        // Hoàn kho khi huỷ và cập nhật phiếu giao hàng
        if (newStatus == OrderStatus.CANCELLED) {
            for (OrderItem item : order.getOrderItems()) {
                Product product = item.getProduct();
                product.setStock(product.getStock() + item.getQuantity());
                productRepository.save(product);
            }
            try {
                deliveryService.cancelDeliveryForOrder(orderId, "Đơn hàng đã bị hủy");
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(OrderServiceImpl.class)
                        .warn("Không thể hủy phiếu giao hàng cho đơn #" + orderId + ": " + e.getMessage());
            }
        }

        order.setStatus(newStatus);
        Order updatedOrder = orderRepository.save(order);

        if (notificationService != null && order.getUser() != null) {
            try {
                notificationService.sendNotification(
                        order.getUser().getId(),
                        "Cập nhật đơn hàng #" + order.getOrderCode(),
                        "Đơn hàng của bạn đã được cập nhật sang trạng thái: " + newStatus.name(),
                        "ORDER",
                        "/orders/" + order.getId()
                );
            } catch (Exception e) {
                log.warn("Không thể gửi thông báo cập nhật đơn hàng: {}", e.getMessage());
            }
        }

        return mapToDTO(updatedOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderDTO> searchOrders(String keyword, OrderStatus status, int pageNo, int pageSize) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        Page<Order> page = orderRepository.searchOrders(kw, status,
                PageRequest.of(pageNo, pageSize));
        List<OrderDTO> content = page.getContent().stream()
                .map(this::mapToDTO).collect(Collectors.toList());
        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderDTO> searchMyOrders(Long userId, String keyword, OrderStatus status, int pageNo, int pageSize) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        int safePage = Math.max(pageNo, 0);
        int safeSize = pageSize > 0 ? Math.min(pageSize, 50) : 10;
        Page<Order> page = orderRepository.searchOrdersByUser(userId, kw, status,
                PageRequest.of(safePage, safeSize));
        List<OrderDTO> content = page.getContent().stream()
                .map(this::mapToDTO).collect(Collectors.toList());
        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getRecentOrders(int limit) {
        return orderRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, Math.max(limit, 1)))
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, Integer.MAX_VALUE))
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    private OrderDTO mapToDTO(Order order) {
        List<OrderItemDTO> itemDTOs = order.getOrderItems() != null ? order.getOrderItems().stream().map(item -> {
            BigDecimal subTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            return new OrderItemDTO(
                    item.getId(),
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getProduct().getImage(),
                    item.getQuantity(),
                    item.getPrice(),
                    subTotal
            );
        }).collect(Collectors.toList()) : new ArrayList<>();

        String customerName = null;
        String customerUsername = null;
        Long userId = null;
        if (order.getUser() != null) {
            userId = order.getUser().getId();
            customerUsername = order.getUser().getUsername();
            customerName = order.getUser().getFullName() != null && !order.getUser().getFullName().isBlank()
                    ? order.getUser().getFullName()
                    : customerUsername;
        }

        BigDecimal subtotal = order.getSubtotal() != null
                ? order.getSubtotal()
                : (order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);

        return OrderDTO.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .subtotal(subtotal)
                .totalAmount(order.getTotalAmount())
                .shippingAddress(order.getShippingAddress())
                .phone(order.getPhone())
                .paymentMethod(order.getPaymentMethod())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .items(itemDTOs)
                .userId(userId)
                .customerName(customerName)
                .customerUsername(customerUsername)
                .discountAmount(order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO)
                .voucherCode(order.getVoucherCode())
                .paymentStatus(order.getPaymentStatus())
                .transferContent(order.getTransferContent())
                .shippingMethod(order.getShippingMethod() != null ? order.getShippingMethod() : dh13c7.baitaplon.model.ShippingMethod.STANDARD)
                .shippingFee(order.getShippingFee() != null ? order.getShippingFee() : BigDecimal.ZERO)
                .build();
    }
}
