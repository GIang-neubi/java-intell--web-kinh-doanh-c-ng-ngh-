package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.RefundDTO;
import dh13c7.baitaplon.model.Order;
import dh13c7.baitaplon.model.RefundStatus;
import dh13c7.baitaplon.model.ReturnRequest;

public interface RefundService {
    void createRefundForCancellation(Order order);
    void createRefundForReturn(ReturnRequest returnRequest);
    
    PageResponse<RefundDTO> getMyRefunds(Long userId, int pageNo, int pageSize);
    RefundDTO getMyRefundById(Long refundId, Long userId);
    
    // Admin
    PageResponse<RefundDTO> searchAdminRefunds(RefundStatus status, int pageNo, int pageSize);
    RefundDTO getRefundById(Long refundId);
    RefundDTO processRefund(Long refundId, RefundStatus status, String transactionRef, String adminNote);
}
