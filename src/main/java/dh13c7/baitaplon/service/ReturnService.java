package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.CreateReturnRequestDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.ReturnRequestDTO;
import dh13c7.baitaplon.model.ReturnStatus;

public interface ReturnService {
    ReturnRequestDTO createReturnRequest(Long userId, CreateReturnRequestDTO requestDTO);
    PageResponse<ReturnRequestDTO> getMyReturnRequests(Long userId, int pageNo, int pageSize);
    ReturnRequestDTO getMyReturnRequestById(Long returnId, Long userId);
    
    // Admin
    PageResponse<ReturnRequestDTO> searchAdminReturns(ReturnStatus status, int pageNo, int pageSize);
    ReturnRequestDTO getReturnRequestById(Long returnId);
    ReturnRequestDTO updateReturnStatus(Long returnId, ReturnStatus status, String adminNote);
}
