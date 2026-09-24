package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.CreateReturnItemDTO;
import dh13c7.baitaplon.dto.CreateReturnRequestDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.ReturnItemDTO;
import dh13c7.baitaplon.dto.ReturnRequestDTO;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.*;
import dh13c7.baitaplon.service.NotificationService;
import dh13c7.baitaplon.service.ReturnService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ReturnServiceImpl implements ReturnService {

    private final ReturnRequestRepository returnRequestRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final NotificationService notificationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private dh13c7.baitaplon.service.RefundService refundService;

    @Override
    @Transactional
    public ReturnRequestDTO createReturnRequest(Long userId, CreateReturnRequestDTO requestDTO) {
        Order order = orderRepository.findById(requestDTO.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        if (!order.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng của bạn");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("Chỉ có thể yêu cầu trả hàng cho đơn hàng đã giao thành công");
        }

        // Kiểm tra window trả hàng: 7 ngày
        if (order.getUpdatedAt() != null && order.getUpdatedAt().plusDays(7).isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Đã quá thời hạn 7 ngày để yêu cầu trả hàng");
        }

        if (requestDTO.getItems() == null || requestDTO.getItems().isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất 1 sản phẩm để trả lại");
        }

        ReturnRequest returnRequest = ReturnRequest.builder()
                .order(order)
                .customer(order.getUser())
                .reason(requestDTO.getReason())
                .description(requestDTO.getDescription())
                .status(ReturnStatus.RETURN_REQUESTED)
                .proofImages(requestDTO.getProofImages())
                .requestedAt(LocalDateTime.now())
                .build();

        // Validate items and quantities
        for (CreateReturnItemDTO itemDTO : requestDTO.getItems()) {
            OrderItem orderItem = orderItemRepository.findById(itemDTO.getOrderItemId())
                    .orElseThrow(() -> new BadRequestException("Sản phẩm không thuộc đơn hàng này"));

            if (!orderItem.getOrder().getId().equals(order.getId())) {
                throw new BadRequestException("Sản phẩm không thuộc đơn hàng này");
            }

            if (itemDTO.getQuantity() <= 0 || itemDTO.getQuantity() > orderItem.getQuantity()) {
                throw new BadRequestException("Số lượng trả lại không hợp lệ cho sản phẩm " + orderItem.getProduct().getName());
            }

            // Kiểm tra tổng số lượng đã trả trước đó để tránh duplicate return (Phase 2 constraint)
            int alreadyReturnedQty = returnRequestRepository.findByOrder_Id(order.getId()).stream()
                    .filter(r -> r.getStatus() != ReturnStatus.RETURN_REJECTED)
                    .flatMap(r -> r.getItems().stream())
                    .filter(i -> i.getOrderItem().getId().equals(orderItem.getId()))
                    .mapToInt(ReturnItem::getQuantity)
                    .sum();

            if (alreadyReturnedQty + itemDTO.getQuantity() > orderItem.getQuantity()) {
                throw new BadRequestException("Số lượng trả lại vượt quá số lượng có thể trả của sản phẩm " + orderItem.getProduct().getName());
            }

            ReturnItem returnItem = ReturnItem.builder()
                    .returnRequest(returnRequest)
                    .orderItem(orderItem)
                    .quantity(itemDTO.getQuantity())
                    .condition(itemDTO.getCondition())
                    .note(itemDTO.getNote())
                    .build();

            returnRequest.getItems().add(returnItem);
        }

        ReturnRequest saved = returnRequestRepository.save(returnRequest);

        try {
            notificationService.notifyAdmins(
                    "Yêu cầu trả hàng mới",
                    "Khách hàng vừa yêu cầu trả hàng cho đơn #" + order.getOrderCode(),
                    "RETURN",
                    "/admin/returns/" + saved.getId()
            );
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo trả hàng: {}", e.getMessage());
        }

        return mapToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReturnRequestDTO> getMyReturnRequests(Long userId, int pageNo, int pageSize) {
        Page<ReturnRequest> page = returnRequestRepository.findByCustomer_IdOrderByCreatedAtDesc(userId, PageRequest.of(pageNo, pageSize));
        List<ReturnRequestDTO> content = page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList());
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public ReturnRequestDTO getMyReturnRequestById(Long returnId, Long userId) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu trả hàng"));
        if (!returnRequest.getCustomer().getId().equals(userId)) {
            throw new ResourceNotFoundException("Không tìm thấy yêu cầu trả hàng");
        }
        return mapToDTO(returnRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReturnRequestDTO> searchAdminReturns(ReturnStatus status, int pageNo, int pageSize) {
        Page<ReturnRequest> page = returnRequestRepository.searchAdmin(status, PageRequest.of(pageNo, pageSize));
        List<ReturnRequestDTO> content = page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList());
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public ReturnRequestDTO getReturnRequestById(Long returnId) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu trả hàng"));
        return mapToDTO(returnRequest);
    }

    @Override
    @Transactional
    public ReturnRequestDTO updateReturnStatus(Long returnId, ReturnStatus status, String adminNote) {
        ReturnRequest request = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu trả hàng"));

        request.setStatus(status);
        if (adminNote != null) {
            request.setAdminNote(adminNote);
        }

        if (status == ReturnStatus.RETURN_APPROVED) {
            request.setApprovedAt(LocalDateTime.now());
        } else if (status == ReturnStatus.RETURN_REJECTED) {
            request.setRejectedAt(LocalDateTime.now());
        } else if (status == ReturnStatus.RETURN_RECEIVED) {
            request.setReceivedAt(LocalDateTime.now());
            // Restore inventory if GOOD
            for (ReturnItem item : request.getItems()) {
                if (item.getCondition() == ReturnCondition.GOOD) {
                    Product product = item.getOrderItem().getProduct();
                    product.setStock(product.getStock() + item.getQuantity());
                    productRepository.save(product);
                }
            }
            // Trigger Refund creation (handled in Phase 5)
            if (refundService != null) {
                try {
                    refundService.createRefundForReturn(request);
                } catch (Exception e) {
                    log.warn("Lỗi tạo refund cho trả hàng: {}", e.getMessage());
                }
            }
        }

        ReturnRequest updated = returnRequestRepository.save(request);

        try {
            notificationService.sendNotification(
                    request.getCustomer().getId(),
                    "Cập nhật yêu cầu trả hàng",
                    "Yêu cầu trả hàng cho đơn #" + request.getOrder().getOrderCode() + " đã chuyển sang: " + status.name(),
                    "RETURN",
                    "/returns/" + updated.getId()
            );
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo cập nhật trả hàng: {}", e.getMessage());
        }

        return mapToDTO(updated);
    }

    private ReturnRequestDTO mapToDTO(ReturnRequest entity) {
        List<ReturnItemDTO> itemDTOs = entity.getItems().stream().map(item -> ReturnItemDTO.builder()
                .id(item.getId())
                .orderItemId(item.getOrderItem().getId())
                .productId(item.getOrderItem().getProduct().getId())
                .productName(item.getOrderItem().getProduct().getName())
                .quantity(item.getQuantity())
                .condition(item.getCondition())
                .note(item.getNote())
                .build()).collect(Collectors.toList());

        return ReturnRequestDTO.builder()
                .id(entity.getId())
                .orderId(entity.getOrder().getId())
                .orderCode(entity.getOrder().getOrderCode())
                .customerId(entity.getCustomer().getId())
                .customerName(entity.getCustomer().getFullName() != null ? entity.getCustomer().getFullName() : entity.getCustomer().getUsername())
                .reason(entity.getReason())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .proofImages(entity.getProofImages())
                .requestedAt(entity.getRequestedAt())
                .approvedAt(entity.getApprovedAt())
                .receivedAt(entity.getReceivedAt())
                .rejectedAt(entity.getRejectedAt())
                .adminNote(entity.getAdminNote())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .items(itemDTOs)
                .build();
    }
}
