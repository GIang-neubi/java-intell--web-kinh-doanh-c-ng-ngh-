package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.VoucherDTO;

public interface VoucherService {
    PageResponse<VoucherDTO> getVouchers(String keyword, Boolean active, int pageNo, int pageSize);
    VoucherDTO getById(Long id);
    VoucherDTO create(VoucherDTO dto);
    VoucherDTO update(Long id, VoucherDTO dto);
    void delete(Long id);
    VoucherDTO toggleActive(Long id);
    VoucherDTO validateForCheckout(String code, java.math.BigDecimal orderAmount);
    java.util.List<dh13c7.baitaplon.dto.CustomerVoucherResponse> getMyVouchers(Long userId, String statusFilter);
}
