package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.CustomerVoucherResponse;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.VoucherDTO;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.DiscountType;
import dh13c7.baitaplon.model.Voucher;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.VoucherRepository;
import dh13c7.baitaplon.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;
    private final OrderRepository orderRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<VoucherDTO> getVouchers(String keyword, Boolean active, int pageNo, int pageSize) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        Page<Voucher> page = voucherRepository.searchVouchers(kw, active, PageRequest.of(pageNo, pageSize));
        List<VoucherDTO> content = page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList());
        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public VoucherDTO getById(Long id) {
        return mapToDTO(findOrThrow(id));
    }

    @Override
    @Transactional
    public VoucherDTO create(VoucherDTO dto) {
        validateDTO(dto, null);
        Voucher voucher = mapToEntity(new Voucher(), dto);
        return mapToDTO(voucherRepository.save(voucher));
    }

    @Override
    @Transactional
    public VoucherDTO update(Long id, VoucherDTO dto) {
        Voucher voucher = findOrThrow(id);
        validateDTO(dto, id);
        mapToEntity(voucher, dto);
        return mapToDTO(voucherRepository.save(voucher));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Voucher voucher = findOrThrow(id);
        if (voucher.getUsedQuantity() > 0) {
            throw new BadRequestException(
                "Không thể xóa voucher \"" + voucher.getCode() + "\" vì đã có " +
                voucher.getUsedQuantity() + " lượt sử dụng. Hãy vô hiệu hóa thay vì xóa.");
        }
        voucherRepository.delete(voucher);
    }

    @Override
    @Transactional
    public VoucherDTO toggleActive(Long id) {
        Voucher voucher = findOrThrow(id);
        voucher.setActive(!voucher.getActive());
        return mapToDTO(voucherRepository.save(voucher));
    }

    @Override
    @Transactional(readOnly = true)
    public VoucherDTO validateForCheckout(String code, java.math.BigDecimal orderAmount) {
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new BadRequestException("Mã giảm giá \"" + code + "\" không tồn tại"));
        if (!voucher.getActive())
            throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        if (now.isBefore(voucher.getStartDate()))
            throw new BadRequestException("Mã giảm giá chưa đến thời gian sử dụng");
        if (now.isAfter(voucher.getEndDate()))
            throw new BadRequestException("Mã giảm giá đã hết hạn");
        if (voucher.getQuantity() > 0 && voucher.getUsedQuantity() >= voucher.getQuantity())
            throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
        if (orderAmount != null && orderAmount.compareTo(voucher.getMinOrderValue()) < 0)
            throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã này");
        return mapToDTO(voucher);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerVoucherResponse> getMyVouchers(Long userId, String statusFilter) {
        List<Voucher> vouchers = voucherRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        Set<String> usedCodes = (userId != null)
                ? orderRepository.findVoucherCodesUsedByUserId(userId).stream()
                    .filter(Objects::nonNull)
                    .map(String::toUpperCase)
                    .collect(Collectors.toSet())
                : Collections.emptySet();

        LocalDateTime now = LocalDateTime.now();

        List<CustomerVoucherResponse> result = vouchers.stream()
                .map(v -> mapToCustomerResponse(v, usedCodes, now))
                .collect(Collectors.toList());

        if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter.trim())) {
            String filter = statusFilter.trim().toUpperCase();
            result = result.stream()
                    .filter(res -> res.getStatus().equalsIgnoreCase(filter))
                    .collect(Collectors.toList());
        }

        return result;
    }

    private CustomerVoucherResponse mapToCustomerResponse(Voucher v, Set<String> usedCodes, LocalDateTime now) {
        boolean usedByUser = usedCodes.contains(v.getCode().toUpperCase());
        String status;
        String statusLabel;
        boolean usable = false;

        if (usedByUser) {
            status = "USED";
            statusLabel = "Đã sử dụng";
        } else if (!Boolean.TRUE.equals(v.getActive())) {
            status = "INACTIVE";
            statusLabel = "Tạm dừng";
        } else if (now.isBefore(v.getStartDate())) {
            status = "UPCOMING";
            statusLabel = "Sắp diễn ra";
        } else if (now.isAfter(v.getEndDate())) {
            status = "EXPIRED";
            statusLabel = "Đã hết hạn";
        } else if (v.getQuantity() > 0 && v.getUsedQuantity() >= v.getQuantity()) {
            status = "OUT_OF_STOCK";
            statusLabel = "Đã hết lượt";
        } else {
            status = "AVAILABLE";
            statusLabel = "Khả dụng";
            usable = true;
        }

        return CustomerVoucherResponse.builder()
                .id(v.getId())
                .code(v.getCode())
                .description(v.getDescription())
                .discountType(v.getDiscountType())
                .discountValue(v.getDiscountValue())
                .minOrderValue(v.getMinOrderValue())
                .maxDiscount(v.getMaxDiscount())
                .quantity(v.getQuantity())
                .usedQuantity(v.getUsedQuantity())
                .startDate(v.getStartDate())
                .endDate(v.getEndDate())
                .status(status)
                .statusLabel(statusLabel)
                .used(usedByUser)
                .usable(usable)
                .build();
    }

    // ── Helpers ──

    private Voucher findOrThrow(Long id) {
        return voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với id: " + id));
    }

    private void validateDTO(VoucherDTO dto, Long excludeId) {
        // Trùng code
        if (excludeId == null) {
            if (voucherRepository.existsByCodeIgnoreCase(dto.getCode().trim())) {
                throw new BadRequestException("Mã voucher \"" + dto.getCode().trim() + "\" đã tồn tại");
            }
        } else {
            if (voucherRepository.existsByCodeIgnoreCaseAndIdNot(dto.getCode().trim(), excludeId)) {
                throw new BadRequestException("Mã voucher \"" + dto.getCode().trim() + "\" đã tồn tại");
            }
        }
        // PERCENT không vượt 100
        if (dto.getDiscountType() == DiscountType.PERCENT
                && dto.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Giá trị giảm theo % không được vượt quá 100");
        }
        // startDate < endDate
        if (dto.getStartDate() != null && dto.getEndDate() != null
                && !dto.getStartDate().isBefore(dto.getEndDate())) {
            throw new BadRequestException("Ngày bắt đầu phải trước ngày kết thúc");
        }
    }

    private Voucher mapToEntity(Voucher v, VoucherDTO dto) {
        v.setCode(dto.getCode().trim().toUpperCase());
        v.setDescription(dto.getDescription());
        v.setDiscountType(dto.getDiscountType());
        v.setDiscountValue(dto.getDiscountValue());
        v.setMinOrderValue(dto.getMinOrderValue() != null ? dto.getMinOrderValue() : BigDecimal.ZERO);
        v.setMaxDiscount(dto.getMaxDiscount());
        v.setQuantity(dto.getQuantity() != null ? dto.getQuantity() : 0);
        v.setStartDate(dto.getStartDate());
        v.setEndDate(dto.getEndDate());
        v.setActive(dto.getActive() != null ? dto.getActive() : true);
        if (v.getUsedQuantity() == null) v.setUsedQuantity(0);
        return v;
    }

    private VoucherDTO mapToDTO(Voucher v) {
        VoucherDTO dto = new VoucherDTO();
        dto.setId(v.getId());
        dto.setCode(v.getCode());
        dto.setDescription(v.getDescription());
        dto.setDiscountType(v.getDiscountType());
        dto.setDiscountValue(v.getDiscountValue());
        dto.setMinOrderValue(v.getMinOrderValue());
        dto.setMaxDiscount(v.getMaxDiscount());
        dto.setQuantity(v.getQuantity());
        dto.setUsedQuantity(v.getUsedQuantity());
        dto.setStartDate(v.getStartDate());
        dto.setEndDate(v.getEndDate());
        dto.setActive(v.getActive());
        dto.setCreatedAt(v.getCreatedAt());
        dto.setUpdatedAt(v.getUpdatedAt());
        return dto;
    }
}
