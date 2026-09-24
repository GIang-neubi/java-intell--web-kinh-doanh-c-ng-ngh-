package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.RefundDTO;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.RefundRepository;
import dh13c7.baitaplon.service.NotificationService;
import dh13c7.baitaplon.service.RefundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class RefundServiceImpl implements RefundService {

    private final RefundRepository refundRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public void createRefundForCancellation(Order order) {
        // Only create refund if paid
        if (!"PAID".equalsIgnoreCase(order.getPaymentStatus()) || order.getPaymentMethod() == PaymentMethod.COD) {
            return;
        }

        // Prevent double refund
        if (refundRepository.findByOrder_Id(order.getId()).isPresent()) {
            return;
        }

        Refund refund = Refund.builder()
                .order(order)
                .amount(order.getTotalAmount())
                .status(RefundStatus.REFUND_PENDING)
                .paymentMethod(order.getPaymentMethod().name())
                .build();
        
        refundRepository.save(refund);
    }

    @Override
    @Transactional
    public void createRefundForReturn(ReturnRequest returnRequest) {
        Order order = returnRequest.getOrder();
        if (!"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            return; // no refund if not paid
        }

        // Calculate amount to refund
        BigDecimal refundAmount = BigDecimal.ZERO;

        for (ReturnItem item : returnRequest.getItems()) {
            if (item.getCondition() == ReturnCondition.DAMAGED && returnRequest.getReason() == ReturnReason.CHANGE_OF_MIND) {
                // If customer damaged it and changed mind, maybe no refund or partial, but for simplicity:
                continue;
            }
            
            // Historical price
            BigDecimal itemPrice = item.getOrderItem().getPrice();
            refundAmount = refundAmount.add(itemPrice.multiply(BigDecimal.valueOf(item.getQuantity())));
        }

        // Pro-rate discount if any (simple implementation: skip voucher pro-rating for now or do full refund if all items returned)
        // If they return everything, refund total Amount.
        boolean isFullReturn = returnRequest.getItems().size() == order.getOrderItems().size() 
                            && returnRequest.getItems().stream().mapToInt(ReturnItem::getQuantity).sum() 
                               == order.getOrderItems().stream().mapToInt(OrderItem::getQuantity).sum();
        
        if (isFullReturn) {
            refundAmount = order.getTotalAmount();
        } else {
            // Apply proportional discount
            if (order.getDiscountAmount() != null && order.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal subtotal = order.getSubtotal() != null ? order.getSubtotal() : BigDecimal.ONE;
                BigDecimal ratio = refundAmount.divide(subtotal, 4, RoundingMode.HALF_UP);
                BigDecimal proportionalDiscount = order.getDiscountAmount().multiply(ratio);
                refundAmount = refundAmount.subtract(proportionalDiscount);
            }
            // Shipping fee policy: CHANGE_OF_MIND -> no shipping refund. Others -> yes (if they want, but let's exclude shipping for partial returns)
        }

        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        // Prevent refunding more than paid total
        if (refundAmount.compareTo(order.getTotalAmount()) > 0) {
            refundAmount = order.getTotalAmount();
        }

        Refund refund = Refund.builder()
                .returnRequest(returnRequest)
                .order(order)
                .amount(refundAmount)
                .status(RefundStatus.REFUND_PENDING)
                .paymentMethod(order.getPaymentMethod().name())
                .build();
        
        refundRepository.save(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<RefundDTO> getMyRefunds(Long userId, int pageNo, int pageSize) {
        Page<Refund> page = refundRepository.findByOrder_User_IdOrderByCreatedAtDesc(userId, PageRequest.of(pageNo, pageSize));
        List<RefundDTO> content = page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList());
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public RefundDTO getMyRefundById(Long refundId, Long userId) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin hoàn tiền"));
        if (!refund.getOrder().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Không tìm thấy thông tin hoàn tiền");
        }
        return mapToDTO(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<RefundDTO> searchAdminRefunds(RefundStatus status, int pageNo, int pageSize) {
        Page<Refund> page = refundRepository.searchAdmin(status, PageRequest.of(pageNo, pageSize));
        List<RefundDTO> content = page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList());
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public RefundDTO getRefundById(Long refundId) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin hoàn tiền"));
        return mapToDTO(refund);
    }

    @Override
    @Transactional
    public RefundDTO processRefund(Long refundId, RefundStatus status, String transactionRef, String adminNote) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin hoàn tiền"));

        if (refund.getStatus() == RefundStatus.REFUNDED) {
            throw new BadRequestException("Khoản hoàn tiền này đã được xử lý hoàn tất trước đó");
        }

        refund.setStatus(status);
        if (transactionRef != null && !transactionRef.isBlank()) {
            refund.setTransactionReference(transactionRef);
        }
        if (adminNote != null && !adminNote.isBlank()) {
            refund.setAdminNote(adminNote);
        }
        
        if (status == RefundStatus.REFUNDED || status == RefundStatus.REFUND_FAILED) {
            refund.setProcessedAt(LocalDateTime.now());
        }

        Refund updated = refundRepository.save(refund);

        try {
            String msg = status == RefundStatus.REFUNDED 
                ? "Đã hoàn tiền " + refund.getAmount() + "đ cho đơn hàng #" + refund.getOrder().getOrderCode()
                : "Quá trình hoàn tiền cho đơn hàng #" + refund.getOrder().getOrderCode() + " bị lỗi/thất bại";
                
            notificationService.sendNotification(
                    refund.getOrder().getUser().getId(),
                    "Cập nhật hoàn tiền",
                    msg,
                    "REFUND",
                    "/account/refunds"
            );
        } catch (Exception e) {
            log.warn("Không thể gửi thông báo cập nhật hoàn tiền", e);
        }

        return mapToDTO(updated);
    }

    private RefundDTO mapToDTO(Refund entity) {
        return RefundDTO.builder()
                .id(entity.getId())
                .returnRequestId(entity.getReturnRequest() != null ? entity.getReturnRequest().getId() : null)
                .orderId(entity.getOrder().getId())
                .orderCode(entity.getOrder().getOrderCode())
                .customerName(entity.getOrder().getUser().getFullName())
                .amount(entity.getAmount())
                .status(entity.getStatus())
                .paymentMethod(entity.getPaymentMethod())
                .transactionReference(entity.getTransactionReference())
                .processedAt(entity.getProcessedAt())
                .adminNote(entity.getAdminNote())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
